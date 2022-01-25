import { MigrationBuilder } from '@contember/database-migrations'
import { SchemaUpdater } from './utils/schemaUpdateUtils.js'
import { Schema } from '@contember/schema'
import { Migration } from '../Migration.js'

export interface ModificationDescription {
	message: string
	isDestructive?: boolean
	failureWarning?: string
}

export const emptyModificationDescriptionContext: ModificationDescriptionContext = { createdEntities: [] }
export type ModificationDescriptionContext = { createdEntities: string[] }

export interface ModificationHandler<Data> {
	createSql(builder: MigrationBuilder): void | Promise<void>

	getSchemaUpdater(): SchemaUpdater

	describe(context: ModificationDescriptionContext): ModificationDescription
}

export type CreateDiff = (originalSchema: Schema, updatedSchema: Schema) => Migration.Modification[]

export interface ModificationHandlerStatic<Data> {
	id: string
	createModification: (data: Data) => Migration.Modification<Data>
	createDiff?: CreateDiff
	new (data: Data, schema: Schema, formatVersion: number): ModificationHandler<Data>
}

export interface Differ {
	createDiff: CreateDiff
}
