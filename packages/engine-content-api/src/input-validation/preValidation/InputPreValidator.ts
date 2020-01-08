import { acceptEveryFieldVisitor } from '@contember/schema-utils'
import { tuple } from '../../utils'
import { Input, Model, Validation, Value } from '@contember/schema'
import { InputValidation } from '@contember/schema-definition'
import { CreateInputVisitor, UpdateInputVisitor } from '../../inputProcessing'
import { CreateInputPreValidationProcessor } from './CreateInputPreValidationProcessor'
import ValidationContext from '../ValidationContext'
import { evaluateValidation } from '../ValidationEvaluation'
import { ValidationPath } from '../ValidationPath'
import { EntityRulesResolver } from '../EntityRulesResolver'
import { FieldValidationResult, ValidationResult } from '../InputValidator'
import { UpdateInputPreValidationProcessor } from './UpdateInputPreValidationProcessor'
import { ColumnValueResolver } from '../ColumnValueResolver'
import Mapper from '../../sql/Mapper'
import DependencyCollector from '../dependencies/DependencyCollector'
import DependencyMerger from '../dependencies/DependencyMerger'
import { NotSupportedError } from '../exceptions'
import ValidationDataSelector from '../ValidationDataSelector'

export interface CreateValidationArgs {
	mapper: Mapper
	entity: Model.Entity
	data: Input.CreateDataInput
	path: ValidationPath
	overRelation: Model.AnyRelation | null
}

export interface UpdateValidationArgs {
	mapper: Mapper
	entity: Model.Entity
	where: Input.UniqueWhere
	data: Input.UpdateDataInput
	path: ValidationPath
}

export class InputPreValidator {
	constructor(
		private readonly model: Model.Schema,
		private readonly entityRulesResolver: EntityRulesResolver,
		private readonly columnValueResolver: ColumnValueResolver,
		private readonly dataSelector: ValidationDataSelector,
	) {}

	async validateCreate({ entity, data, path, mapper, overRelation }: CreateValidationArgs): Promise<ValidationResult> {
		const simpleRules = this.entityRulesResolver.getSimpleRules(entity.name)
		const fieldsWithRules = Object.keys(simpleRules).filter(field => simpleRules[field].length > 0)

		const dataWithRelation = overRelation
			? {
					...data,
					[overRelation.name]: { create: {} },
			  }
			: data
		const context = this.createContextForCreate(entity, dataWithRelation)

		const fieldsResult = this.validateFields(fieldsWithRules, simpleRules, context, path)

		const processor = new CreateInputPreValidationProcessor(this, path, mapper)
		const visitor = new CreateInputVisitor(processor, this.model, data)
		const relationResult = await this.validateRelations(entity, visitor)

		return [...fieldsResult, ...relationResult]
	}

	async validateUpdate({ entity, data, path, mapper, where }: UpdateValidationArgs): Promise<ValidationResult> {
		const simpleRules = this.entityRulesResolver.getSimpleRules(entity.name)
		const fieldsWithRules = Object.keys(data).filter(field => simpleRules[field] && simpleRules[field].length > 0)
		const dependencies = this.buildDependencies(fieldsWithRules, simpleRules)

		const context = await this.createContextForUpdate(mapper, entity, where, data, dependencies)
		const fieldsResult: ValidationResult = this.validateFields(fieldsWithRules, simpleRules, context, path)

		const processor = new UpdateInputPreValidationProcessor(this, path, mapper)
		const visitor = new UpdateInputVisitor(processor, this.model, data)
		const relationResult = await this.validateRelations(entity, visitor)

		return [...fieldsResult, ...relationResult]
	}

	private createContextForCreate(entity: Model.Entity, data: Input.CreateDataInput): ValidationContext.NodeContext {
		const nodeData = acceptEveryFieldVisitor(this.model, entity, {
			visitColumn: (entity, column) => {
				const value = data[column.name] as Input.ColumnValue | undefined
				return this.columnValueResolver.getDefaultValidationValue({ entity, column, input: value })
			},
			visitHasOne: (entity, relation) => {
				const value = data[relation.name] as Input.CreateOneRelationInput | undefined
				return value ? true : null
			},
			// more complex validation on relations are not possible in pre-validation phase
			visitHasMany: () => null,
		})

		return ValidationContext.createRootContext(nodeData)
	}
	private async createContextForUpdate(
		mapper: Mapper,
		entity: Model.Entity,
		where: Input.UniqueWhere,
		data: Input.UpdateDataInput,
		dependencies: DependencyCollector.Dependencies,
	): Promise<ValidationContext.NodeContext> {
		const inputNodeData = acceptEveryFieldVisitor(this.model, entity, {
			visitColumn: (entity, column) => {
				return data[column.name] as Input.ColumnValue | undefined
			},
			visitHasOne: (entity, relation) => {
				const value = data[relation.name] as Input.CreateOneRelationInput | Input.UpdateOneRelationInput | undefined
				if (value === undefined) {
					return undefined
				}
				return 'disconnect' in value || 'delete' in value ? null : true
			},
			// more complex validation on relations are not possible in pre-validation phase
			visitHasMany: () => null,
		})

		const missingDependencies = Object.keys(dependencies).filter(it => inputNodeData[it] === undefined)
		missingDependencies.forEach(it => {
			if (Object.keys(dependencies[it]).length !== 0) {
				throw new NotSupportedError()
			}
		})

		const dbData = await this.dataSelector.select(
			mapper,
			entity,
			where,
			missingDependencies.reduce((acc, field) => ({ ...acc, [field]: {} }), {}),
		)

		return ValidationContext.createRootContext({ ...(inputNodeData as Value.Object), ...(dbData || {}) })
	}

	private validateFields(
		fields: string[],
		entityRules: Validation.EntityRules,
		context: ValidationContext.NodeContext,
		path: ValidationPath,
	) {
		return fields
			.map(field => tuple(field, entityRules[field]))
			.map(([field, fieldRules]) =>
				tuple(
					field,
					fieldRules.find(it => !evaluateValidation(context, InputValidation.rules.on(field, it.validator))),
				),
			)
			.filter((arg): arg is [string, Validation.ValidationRule] => !!arg[1])
			.map(([field, { message }]) => ({ path: [...path, { field }], message }))
	}

	private async validateRelations(
		entity: Model.Entity,
		visitor: Model.FieldVisitor<Promise<ValidationResult | ValidationResult[] | undefined>>,
	): Promise<FieldValidationResult[]> {
		const validateRelationsResult = acceptEveryFieldVisitor(this.model, entity, visitor)

		return (await Promise.all(Object.values(validateRelationsResult)))
			.filter((value): value is FieldValidationResult[] | FieldValidationResult[][] => value !== undefined)
			.reduce<(FieldValidationResult[] | FieldValidationResult)[]>((res, it) => [...res, ...it], [])
			.reduce<FieldValidationResult[]>((res, it) => [...res, ...(Array.isArray(it) ? it : [it])], [])
	}

	private buildDependencies(fields: string[], entityRules: Validation.EntityRules): DependencyCollector.Dependencies {
		return fields
			.map(it => entityRules[it] || [])
			.reduce((acc, val) => [...acc, ...val], [])
			.map(it => DependencyCollector.collect(it.validator))
			.concat(fields.reduce((acc, field) => (entityRules[field] ? { ...acc, [field]: {} } : acc), {}))
			.reduce((acc, dependency) => DependencyMerger.merge(acc, dependency), {})
	}
}