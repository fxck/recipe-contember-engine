import { Schema } from '@contember/schema'
import ModificationHandlerFactory from './modifications/ModificationHandlerFactory.js'
import { Migration } from './Migration.js'

export class SchemaMigrator {
	constructor(private readonly modificationHandlerFactory: ModificationHandlerFactory) {}

	public applyModifications(schema: Schema, diff: readonly Migration.Modification[], formatVersion: number): Schema {
		for (const modification of diff) {
			const { modification: name, ...data } = modification
			const modificationHandler = this.modificationHandlerFactory.create(name, data, schema, formatVersion)
			schema = modificationHandler.getSchemaUpdater()({ schema })
		}
		return schema
	}
}
