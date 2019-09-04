import { MigrationBuilder } from 'node-pg-migrate'
import { Model, Schema } from '@contember/schema'
import { ContentEvent } from '../../../dtos/Event'
import { SchemaUpdater, updateModel } from '../schemaUpdateUtils'
import { Modification } from '../Modification'
import { createEventTrigger } from '../sqlUpdateUtils'

class CreateEntityModification implements Modification<CreateEntityModification.Data> {
	constructor(private readonly data: CreateEntityModification.Data, private readonly schema: Schema) {}

	public createSql(builder: MigrationBuilder): void {
		const entity = this.data.entity
		const primaryColumn = entity.fields[entity.primary] as Model.AnyColumn
		builder.createTable(entity.tableName, {
			[primaryColumn.name]: {
				primaryKey: true,
				type: primaryColumn.type === Model.ColumnType.Enum ? `"${primaryColumn.columnType}"` : primaryColumn.columnType,
				notNull: true,
			},
		})
		createEventTrigger(builder, entity.tableName)
	}

	public getSchemaUpdater(): SchemaUpdater {
		return updateModel(model => ({
			...model,
			entities: {
				...model.entities,
				[this.data.entity.name]: this.data.entity,
			},
		}))
	}

	public transformEvents(events: ContentEvent[]): ContentEvent[] {
		return events
	}
}

namespace CreateEntityModification {
	export const id = 'createEntity'

	export interface Data {
		entity: Model.Entity
	}
}

export default CreateEntityModification
