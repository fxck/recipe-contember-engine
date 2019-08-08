import { Input, Model } from 'cms-common'
import CreateInputProcessor from './CreateInputProcessor'
import { isIt } from '../../utils/type'
import * as Context from './InputContext'
import { filterObject } from '../../utils/object'
import UserError from '../../core/graphql/UserError'

export default class CreateInputVisitor<Result>
	implements
		Model.ColumnVisitor<Promise<Result | Result[] | undefined>>,
		Model.RelationByTypeVisitor<Promise<Result | Result[] | undefined>> {
	constructor(
		private readonly createInputProcessor: CreateInputProcessor<Result>,
		private readonly schema: Model.Schema,
		private readonly data: Input.CreateDataInput,
	) {}

	public visitColumn(entity: Model.Entity, column: Model.AnyColumn): Promise<Result> {
		return this.createInputProcessor.column({
			entity,
			column,
			input: this.data[column.name] as Input.ColumnValue,
		})
	}

	public visitManyHasManyInversed(
		entity: Model.Entity,
		relation: Model.ManyHasManyInversedRelation,
		targetEntity: Model.Entity,
		targetRelation: Model.ManyHasManyOwnerRelation,
	) {
		return this.processManyRelationInput<Context.ManyHasManyInversedContext>(
			this.createInputProcessor.manyHasManyInversed,
			{
				entity,
				relation,
				targetEntity,
				targetRelation,
			},
			this.data[relation.name] as Input.CreateManyRelationInput,
		)
	}

	public visitManyHasManyOwner(
		entity: Model.Entity,
		relation: Model.ManyHasManyOwnerRelation,
		targetEntity: Model.Entity,
		targetRelation: Model.ManyHasManyInversedRelation | null,
	) {
		return this.processManyRelationInput<Context.ManyHasManyOwnerContext>(
			this.createInputProcessor.manyHasManyOwner,
			{
				entity,
				relation,
				targetEntity,
				targetRelation,
			},
			this.data[relation.name] as Input.CreateManyRelationInput,
		)
	}

	public visitManyHasOne(
		entity: Model.Entity,
		relation: Model.ManyHasOneRelation,
		targetEntity: Model.Entity,
		targetRelation: Model.OneHasManyRelation | null,
	) {
		return this.processRelationInput<Context.ManyHasOneContext>(
			this.createInputProcessor.manyHasOne,
			{
				entity,
				relation,
				targetEntity,
				targetRelation,
			},
			this.data[relation.name] as Input.CreateOneRelationInput,
		)
	}

	public visitOneHasMany(
		entity: Model.Entity,
		relation: Model.OneHasManyRelation,
		targetEntity: Model.Entity,
		targetRelation: Model.ManyHasOneRelation,
	) {
		return this.processManyRelationInput<Context.OneHasManyContext>(
			this.createInputProcessor.oneHasMany,
			{
				entity,
				relation,
				targetEntity,
				targetRelation,
			},
			this.data[relation.name] as Input.CreateManyRelationInput,
		)
	}

	public visitOneHasOneInversed(
		entity: Model.Entity,
		relation: Model.OneHasOneInversedRelation,
		targetEntity: Model.Entity,
		targetRelation: Model.OneHasOneOwnerRelation,
	) {
		return this.processRelationInput<Context.OneHasOneInversedContext>(
			this.createInputProcessor.oneHasOneInversed,
			{
				entity,
				relation,
				targetEntity,
				targetRelation,
			},
			this.data[relation.name] as Input.CreateOneRelationInput,
		)
	}

	public visitOneHasOneOwner(
		entity: Model.Entity,
		relation: Model.OneHasOneOwnerRelation,
		targetEntity: Model.Entity,
		targetRelation: Model.OneHasOneInversedRelation | null,
	) {
		return this.processRelationInput<Context.OneHasOneOwnerContext>(
			this.createInputProcessor.oneHasOneOwner,
			{
				entity,
				relation,
				targetEntity,
				targetRelation,
			},
			this.data[relation.name] as Input.CreateOneRelationInput,
		)
	}

	private processRelationInput<Context>(
		processor: CreateInputProcessor.HasOneRelationProcessor<Context, Result>,
		context: Context,
		input: Input.CreateOneRelationInput | undefined,
	): Promise<undefined | Result> {
		if (input === undefined || input === null) {
			return Promise.resolve(undefined)
		}
		input = filterObject(input, (k, v) => v !== null && v !== undefined)
		this.verifyOperations(input)
		if (isIt<Input.ConnectRelationInput>(input, 'connect')) {
			return processor.connect({ ...context, input: input.connect })
		}
		if (isIt<Input.CreateRelationInput>(input, 'create')) {
			return processor.create({ ...context, input: input.create })
		}
		throw new Error()
	}

	private processManyRelationInput<Context>(
		processor: CreateInputProcessor.HasManyRelationProcessor<Context, Result>,
		context: Context,
		input: Input.CreateManyRelationInput | undefined,
	): Promise<undefined | Result[]> {
		if (input === undefined || input === null) {
			return Promise.resolve(undefined)
		}
		const promises: Array<Promise<Result>> = []
		let i = 0
		for (let element of input) {
			const alias = element.alias
			element = filterObject(element, (k, v) => v !== null && v !== undefined)
			this.verifyOperations(element)
			let result
			if (isIt<Input.ConnectRelationInput>(element, 'connect')) {
				result = processor.connect({ ...context, input: element.connect, index: i++, alias })
			}
			if (isIt<Input.CreateRelationInput>(element, 'create')) {
				result = processor.create({ ...context, input: element.create, index: i++, alias })
			}
			if (result !== undefined) {
				promises.push(result)
			}
		}
		return Promise.all(promises)
	}

	private verifyOperations(input: any) {
		const keys = Object.keys(input).filter(it => it !== 'alias')
		if (keys.length !== 1) {
			const found = keys.length === 0 ? 'none' : keys.join(', ')
			throw new UserError(`Expected either "create" or "connect". ${found} found.`)
		}
	}
}
