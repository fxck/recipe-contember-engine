import { MigrationBuilder } from 'node-pg-migrate'
import { Model, Schema } from '@contember/schema'
import { ContentEvent } from '@contember/engine-common'
import { addField, SchemaUpdater, updateEntity, updateModel } from '../schemaUpdateUtils'
import { Modification } from '../Modification'
import { EventType } from '@contember/engine-common'
import { wrapIdentifier } from '../../utils/dbHelpers'
import { getColumnName, resolveDefaultValue } from '@contember/schema-utils'
import { escapeValue } from '../..'
import { ImplementationException } from '../../exceptions'

class CreateColumnModification implements Modification<CreateColumnModification.Data> {
	constructor(private readonly data: CreateColumnModification.Data, private readonly schema: Schema) {}

	public createSql(builder: MigrationBuilder): void {
		const entity = this.schema.model.entities[this.data.entityName]
		const column = this.data.field
		const hasSeed = this.data.fillValue !== undefined || this.data.copyValue !== undefined
		builder.addColumn(entity.tableName, {
			[column.columnName]: {
				type: column.type === Model.ColumnType.Enum ? `"${column.columnType}"` : column.columnType,
				notNull: !column.nullable && !hasSeed,
			},
		})
		if (hasSeed) {
			if (this.data.fillValue !== undefined) {
				builder.sql(`UPDATE ${wrapIdentifier(entity.tableName)} 
	  SET ${wrapIdentifier(column.columnName)} = ${escapeValue(this.data.fillValue)}`)
			} else if (this.data.copyValue !== undefined) {
				const copyFrom = getColumnName(this.schema.model, entity, this.data.copyValue)
				builder.sql(`UPDATE ${wrapIdentifier(entity.tableName)} 
	  SET ${wrapIdentifier(column.columnName)} = ${wrapIdentifier(copyFrom)}`)
			} else {
				throw new ImplementationException()
			}

			// event applier defers constraint check, we need to fire them before ALTER
			builder.sql(`SET CONSTRAINTS ALL IMMEDIATE`)
			builder.sql(`SET CONSTRAINTS ALL DEFERRED`)

			if (!column.nullable) {
				builder.alterColumn(entity.tableName, column.columnName, {
					notNull: true,
				})
			}
		}
	}

	public getSchemaUpdater(): SchemaUpdater {
		return updateModel(updateEntity(this.data.entityName, addField(this.data.field)))
	}

	public transformEvents(events: ContentEvent[]): ContentEvent[] {
		const entity = this.schema.model.entities[this.data.entityName]

		return events.map(it => {
			if (it.tableName !== entity.tableName || it.type !== EventType.create) {
				return it
			}

			try {
				let value: any = null
				if (this.data.fillValue !== undefined) {
					value = this.data.fillValue
				} else if (this.data.copyValue !== undefined) {
					const columnName = getColumnName(this.schema.model, entity, this.data.copyValue)
					value = it.values[columnName] !== undefined ? it.values[columnName] : null
				} else {
					value = resolveDefaultValue(this.data.field, { now: () => it.createdAt })
				}
				return {
					...it,
					[this.data.field.columnName]: value,
				}
			} catch (e) {
				// if (e instanceof NoDataError) {
				// 	return {...it, errors: [...it.errors || []]}
				// }
				throw e
			}
		})
	}
}

namespace CreateColumnModification {
	export const id = 'createColumn'

	export interface Data {
		entityName: string
		field: Model.AnyColumn
		fillValue?: any
		copyValue?: string
	}
}

export default CreateColumnModification
