import ModificationHandlerFactory from './modifications/ModificationHandlerFactory.js'
import { createMigrationBuilder } from '@contember/database-migrations'
import { Migration } from './Migration.js'
import { Schema } from '@contember/schema'
import {
	emptyModificationDescriptionContext,
	ModificationDescription,
	ModificationDescriptionContext,
	ModificationHandler,
} from './modifications/ModificationHandler.js'
import { CreateEntityModification } from './modifications/entities/index.js'
import { SchemaValidator, ValidationError } from '@contember/schema-utils'
import { SchemaUpdateError } from './modifications/exceptions.js'

export interface ModificationDescriptionResult {
	modification: Migration.Modification
	sql: string
	schema: Schema
	description: ModificationDescription
	handler: ModificationHandler<any>
	errors: ValidationError[]
}

export class MigrationDescriber {
	constructor(private readonly modificationHandlerFactory: ModificationHandlerFactory) {}

	public async describeModification(
		schema: Schema,
		modification: Migration.Modification,
		formatVersion: number,
		modificationDescriptionContext: ModificationDescriptionContext = emptyModificationDescriptionContext,
	): Promise<ModificationDescriptionResult> {
		const builder = createMigrationBuilder()
		const modificationHandler = this.modificationHandlerFactory.create(
			modification.modification,
			modification,
			schema,
			formatVersion,
		)
		try {
			schema = modificationHandler.getSchemaUpdater()({ schema })
		} catch (e) {
			if (!(e instanceof SchemaUpdateError)) {
				throw e
			}
			throw new SchemaUpdateError(e.message + '\n for modification: \n' + JSON.stringify(modification))
		}
		await modificationHandler.createSql(builder)
		const errors = SchemaValidator.validate(schema)
		return {
			modification,
			schema,
			sql: builder.getSql(),
			description: modificationHandler.describe(modificationDescriptionContext),
			errors,
			handler: modificationHandler,
		}
	}

	public async describeModifications(schema: Schema, migration: Migration): Promise<ModificationDescriptionResult[]> {
		const result = []
		const createdEntities = []
		for (const modification of migration.modifications) {
			if (modification.modification === CreateEntityModification.id) {
				createdEntities.push(modification.entity.name)
			}
			const description = await this.describeModification(schema, modification, migration.formatVersion, {
				createdEntities,
			})
			schema = description.schema
			result.push(description)
		}
		return result
	}
}
