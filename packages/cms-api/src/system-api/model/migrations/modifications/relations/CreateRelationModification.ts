import { Model, Schema } from '@contember/schema'
import { NamingHelper, acceptRelationTypeVisitor } from '@contember/schema-utils'
import { MigrationBuilder } from 'node-pg-migrate'
import { ContentEvent } from '../../../dtos/Event'
import { addField, SchemaUpdater, updateEntity, updateModel } from '../schemaUpdateUtils'
import { Modification } from '../Modification'
import { createEventTrigger } from '../sqlUpdateUtils'

const getPrimaryType = (entity: Model.Entity): string => {
	const column = entity.fields[entity.primary] as Model.AnyColumn
	return column.columnType
}

class CreateRelationModification implements Modification<CreateRelationModification.Data> {
	constructor(private readonly data: CreateRelationModification.Data, private readonly schema: Schema) {}

	public createSql(builder: MigrationBuilder): void {
		const entity = this.schema.model.entities[this.data.entityName]
		const targetEntity = this.schema.model.entities[this.data.owningSide.target]
		acceptRelationTypeVisitor(this.schema.model, entity, this.data.owningSide, {
			visitManyHasOne: ({}, relation, {}, _) => {
				builder.addColumn(entity.tableName, {
					[relation.joiningColumn.columnName]: {
						type: getPrimaryType(targetEntity),
						notNull: !relation.nullable,
					},
				})
				const fkName = NamingHelper.createForeignKeyName(
					entity.tableName,
					relation.joiningColumn.columnName,
					targetEntity.tableName,
					targetEntity.primaryColumn,
				)
				builder.addConstraint(entity.tableName, fkName, {
					foreignKeys: {
						columns: relation.joiningColumn.columnName,
						references: `"${targetEntity.tableName}"("${targetEntity.primaryColumn}")`,
						onDelete: 'NO ACTION',
					},
					deferrable: true,
					deferred: false,
				})
				builder.addIndex(entity.tableName, relation.joiningColumn.columnName)
			},
			visitOneHasMany: () => {},
			visitOneHasOneOwner: ({}, relation, {}, _) => {
				builder.addColumn(entity.tableName, {
					[relation.joiningColumn.columnName]: {
						type: getPrimaryType(targetEntity),
						notNull: !relation.nullable,
					},
				})
				const uniqueConstraintName = NamingHelper.createUniqueConstraintName(entity.name, [relation.name])

				builder.addConstraint(entity.tableName, uniqueConstraintName, { unique: [relation.joiningColumn.columnName] })

				const fkName = NamingHelper.createForeignKeyName(
					entity.tableName,
					relation.joiningColumn.columnName,
					targetEntity.tableName,
					targetEntity.primaryColumn,
				)
				builder.addConstraint(entity.tableName, fkName, {
					foreignKeys: {
						columns: relation.joiningColumn.columnName,
						references: `"${targetEntity.tableName}"("${targetEntity.primaryColumn}")`,
						onDelete: 'NO ACTION',
					},
					deferrable: true,
					deferred: false,
				})
			},
			visitOneHasOneInversed: () => {},
			visitManyHasManyOwner: ({}, relation, {}, _) => {
				builder.createTable(
					relation.joiningTable.tableName,
					{
						id: {
							primaryKey: true,
							type: 'uuid',
							notNull: true,
						},
						[relation.joiningTable.joiningColumn.columnName]: {
							type: getPrimaryType(entity),
							notNull: true,
							references: `"${entity.tableName}"("${entity.primaryColumn}")`,
							onDelete: 'CASCADE',
						},
						[relation.joiningTable.inverseJoiningColumn.columnName]: {
							type: getPrimaryType(targetEntity),
							notNull: true,
							references: `"${targetEntity.tableName}"("${targetEntity.primaryColumn}")`,
							onDelete: 'CASCADE',
						},
					},
					{
						constraints: {
							unique: [
								relation.joiningTable.joiningColumn.columnName,
								relation.joiningTable.inverseJoiningColumn.columnName,
							],
						},
					},
				)
				createEventTrigger(builder, relation.joiningTable.tableName)
			},
			visitManyHasManyInversed: () => {},
		})
	}

	public getSchemaUpdater(): SchemaUpdater {
		return updateModel(
			updateEntity(this.data.entityName, addField(this.data.owningSide)),
			this.data.inverseSide !== undefined
				? updateEntity(this.data.owningSide.target, addField(this.data.inverseSide))
				: undefined,
		)
	}

	public transformEvents(events: ContentEvent[]): ContentEvent[] {
		return events //todo fill
	}
}

namespace CreateRelationModification {
	export const id = 'createRelation'

	export interface Data {
		entityName: string
		owningSide: Model.AnyRelation & Model.OwnerRelation
		inverseSide?: Model.AnyRelation & Model.InversedRelation
	}
}

export default CreateRelationModification
