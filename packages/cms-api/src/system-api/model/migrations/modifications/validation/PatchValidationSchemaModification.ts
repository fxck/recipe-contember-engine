import { MigrationBuilder } from 'node-pg-migrate'
import { deepCopy } from 'cms-common'
import { ContentEvent } from '../../../dtos/Event'
import { SchemaUpdater } from '../schemaUpdateUtils'
import { Modification } from '../Modification'
import { applyPatch, Operation } from 'rfc6902'

class PatchValidationSchemaModification implements Modification<PatchValidationSchemaModification.Data> {
	constructor(private readonly data: PatchValidationSchemaModification.Data) {}

	public createSql(builder: MigrationBuilder): void {}

	public getSchemaUpdater(): SchemaUpdater {
		return schema => {
			const validation = deepCopy(schema.validation)
			const result = applyPatch(validation, this.data.patch).filter(it => it !== null)
			if (result.length > 0) {
				throw result[0]
			}

			return {
				...schema,
				validation,
			}
		}
	}

	public transformEvents(events: ContentEvent[]): ContentEvent[] {
		return events
	}
}

namespace PatchValidationSchemaModification {
	export const id = 'patchValidationSchema'

	export interface Data {
		patch: Operation[]
	}
}

export default PatchValidationSchemaModification
