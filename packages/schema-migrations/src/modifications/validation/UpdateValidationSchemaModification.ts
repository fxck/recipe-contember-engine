import { MigrationBuilder } from '@contember/database-migrations'
import { Schema, Validation } from '@contember/schema'
import { SchemaUpdater } from '../utils/schemaUpdateUtils.js'
import { ModificationHandlerStatic } from '../ModificationHandler.js'
import deepEqual from 'fast-deep-equal'
import { createPatch } from 'rfc6902'
import { PatchValidationSchemaModification } from './PatchValidationSchemaModification.js'

export const UpdateValidationSchemaModification: ModificationHandlerStatic<UpdateValidationSchemaModificationData> = class {
	static id = 'updateValidationSchema'
	constructor(private readonly data: UpdateValidationSchemaModificationData) {}

	public createSql(builder: MigrationBuilder): void {}

	public getSchemaUpdater(): SchemaUpdater {
		return ({ schema }) => ({
			...schema,
			validation: this.data.schema,
		})
	}

	describe() {
		return { message: 'Update validation schema' }
	}

	static createModification(data: UpdateValidationSchemaModificationData) {
		return { modification: this.id, ...data }
	}

	static createDiff(originalSchema: Schema, updatedSchema: Schema) {
		if (deepEqual(originalSchema.validation, updatedSchema.validation)) {
			return []
		}
		const patch = createPatch(originalSchema.validation, updatedSchema.validation)
		if (patch.length <= 20) {
			return [PatchValidationSchemaModification.createModification({ patch })]
		}
		return [UpdateValidationSchemaModification.createModification({ schema: updatedSchema.validation })]
	}
}

export interface UpdateValidationSchemaModificationData {
	schema: Validation.Schema
}
