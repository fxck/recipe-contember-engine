import { MigrationBuilder } from 'node-pg-migrate'
import { Validation } from '@contember/schema'
import { ContentEvent } from '../../../dtos/Event'
import { SchemaUpdater } from '../schemaUpdateUtils'
import { Modification } from '../Modification'

class UpdateValidationSchemaModification implements Modification<UpdateValidationSchemaModification.Data> {
	constructor(private readonly data: UpdateValidationSchemaModification.Data) {}

	public createSql(builder: MigrationBuilder): void {}

	public getSchemaUpdater(): SchemaUpdater {
		return schema => ({
			...schema,
			validation: this.data.schema,
		})
	}

	public transformEvents(events: ContentEvent[]): ContentEvent[] {
		return events
	}
}

namespace UpdateValidationSchemaModification {
	export const id = 'updateValidationSchema'

	export interface Data {
		schema: Validation.Schema
	}
}

export default UpdateValidationSchemaModification
