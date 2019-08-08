import { MigrationBuilder } from 'node-pg-migrate'
import { Schema } from 'cms-common'
import { ContentEvent } from '../../../dtos/Event'
import { SchemaUpdater, updateEntity, updateModel } from '../schemaUpdateUtils'
import { Modification } from '../Modification'

class UpdateEntityTableNameModification implements Modification<UpdateEntityTableNameModification.Data> {
	constructor(private readonly data: UpdateEntityTableNameModification.Data, private readonly schema: Schema) {}

	public createSql(builder: MigrationBuilder): void {
		const entity = this.schema.model.entities[this.data.entityName]
		builder.renameTable(entity.tableName, this.data.tableName)
	}

	public getSchemaUpdater(): SchemaUpdater {
		return updateModel(
			updateEntity(this.data.entityName, entity => ({
				...entity,
				tableName: this.data.tableName,
			})),
		)
	}

	public transformEvents(events: ContentEvent[]): ContentEvent[] {
		const entity = this.schema.model.entities[this.data.entityName]
		return events.map(it => {
			if (it.tableName !== entity.tableName) {
				return it
			}
			return { ...it, tableName: this.data.tableName }
		})
	}
}

namespace UpdateEntityTableNameModification {
	export const id = 'updateEntityTableName'

	export interface Data {
		entityName: string
		tableName: string
	}
}

export default UpdateEntityTableNameModification
