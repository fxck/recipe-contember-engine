import { MigrationBuilder } from '@contember/database-migrations'
import { Model, Schema } from '@contember/schema'
import { SchemaUpdater, updateEntity, updateModel } from '../utils/schemaUpdateUtils.js'
import { ModificationHandlerStatic } from '../ModificationHandler.js'
import { acceptFieldVisitor } from '@contember/schema-utils'

export const CreateUniqueConstraintModification: ModificationHandlerStatic<CreateUniqueConstraintModificationData> = class {
	static id = 'createUniqueConstraint'

	constructor(private readonly data: CreateUniqueConstraintModificationData, private readonly schema: Schema) {}

	public createSql(builder: MigrationBuilder): void {
		const entity = this.schema.model.entities[this.data.entityName]
		if (entity.view) {
			return
		}
		const fields = this.data.unique.fields
		const columns = fields.map(fieldName => {
			return acceptFieldVisitor(this.schema.model, entity, fieldName, {
				visitColumn: ({}, column) => {
					return column.columnName
				},
				visitManyHasOne: ({}, relation) => {
					return relation.joiningColumn.columnName
				},
				visitOneHasMany: () => {
					throw new Error(`Cannot create unique key on 1:m relation in ${entity.name}.${fieldName}`)
				},
				visitOneHasOneOwning: () => {
					throw new Error(
						`Cannot create unique key on 1:1 relation, this relation has unique key by default in ${entity.name}.${fieldName}`,
					)
				},
				visitOneHasOneInverse: () => {
					throw new Error(`Cannot create unique key on 1:1 inverse relation in ${entity.name}.${fieldName}`)
				},
				visitManyHasManyOwning: () => {
					throw new Error(`Cannot create unique key on m:m relation in ${entity.name}.${fieldName}`)
				},
				visitManyHasManyInverse: () => {
					throw new Error(`Cannot create unique key on m:m inverse relation in ${entity.name}.${fieldName}`)
				},
			})
		})
		builder.addConstraint(entity.tableName, this.data.unique.name, { unique: columns })
	}

	public getSchemaUpdater(): SchemaUpdater {
		return updateModel(
			updateEntity(this.data.entityName, ({ entity }) => ({
				...entity,
				unique: {
					...entity.unique,
					[this.data.unique.name]: this.data.unique,
				},
			})),
		)
	}

	describe({ createdEntities }: { createdEntities: string[] }) {
		return {
			message: `Create unique constraint (${this.data.unique.fields.join(', ')}) on entity ${this.data.entityName}`,
			failureWarning: !createdEntities.includes(this.data.entityName)
				? 'Make sure no conflicting rows exists, otherwise this may fail in runtime.'
				: undefined,
		}
	}

	static createModification(data: CreateUniqueConstraintModificationData) {
		return { modification: this.id, ...data }
	}

	static createDiff(originalSchema: Schema, updatedSchema: Schema) {
		return Object.values(updatedSchema.model.entities).flatMap(entity =>
			Object.values(entity.unique)
				.filter(it => !originalSchema.model.entities[entity.name].unique[it.name])
				.map(unique => CreateUniqueConstraintModification.createModification({ entityName: entity.name, unique })),
		)
	}
}

export interface CreateUniqueConstraintModificationData {
	entityName: string
	unique: Model.UniqueConstraint
}
