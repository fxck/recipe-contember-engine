import { Schema } from '@contember/schema'
import {
	deepCompare,
	isInverseRelation,
	isOwningRelation,
	isRelation,
	SchemaValidator,
	ValidationError,
} from '@contember/schema-utils'
import { SchemaMigrator } from './SchemaMigrator.js'
import { Migration } from './Migration.js'
import deepEqual from 'fast-deep-equal'
import { ImplementationException } from './exceptions.js'
import { VERSION_LATEST } from './modifications/ModificationVersions.js'
import { CreateUniqueConstraintModification, RemoveUniqueConstraintModification } from './modifications/constraints/index.js'
import { RemoveFieldModification } from './modifications/fields/index.js'
import {
	CreateEntityModification,
	CreateViewModification,
	RemoveEntityModification,
	UpdateEntityTableNameModification,
} from './modifications/entities/index.js'
import { CreateEnumModification, RemoveEnumModification, UpdateEnumModification } from './modifications/enums/index.js'
import {
	CreateColumnModification,
	UpdateColumnDefinitionModification,
	UpdateColumnNameModification,
} from './modifications/columns/index.js'
import {
	ConvertOneToManyRelationModification,
	CreateRelationInverseSideModification,
	CreateRelationModification,
	DisableOrphanRemovalModification,
	EnableOrphanRemovalModification,
	MakeRelationNotNullModification,
	MakeRelationNullableModification,
	UpdateRelationOnDeleteModification,
	UpdateRelationOrderByModification,
} from './modifications/relations/index.js'
import { PatchAclSchemaModification, UpdateAclSchemaModification } from './modifications/acl/index.js'
import { PatchValidationSchemaModification, UpdateValidationSchemaModification } from './modifications/validation/index.js'
import { CreateDiff, Differ } from './modifications/ModificationHandler.js'
import { isDefined } from './utils/isDefined.js'
import { ChangeViewNonViewDiffer, RemoveChangedFieldDiffer, RemoveChangedViewDiffer } from './modifications/differs/index.js'

export class SchemaDiffer {
	constructor(private readonly schemaMigrator: SchemaMigrator) {}

	diffSchemas(originalSchema: Schema, updatedSchema: Schema, checkRecreate: boolean = true): Migration.Modification[] {
		const originalErrors = SchemaValidator.validate(originalSchema)
		if (originalErrors.length > 0) {
			throw new InvalidSchemaException('original schema is not valid', originalErrors)
		}
		const updatedErrors = SchemaValidator.validate(updatedSchema)
		if (updatedErrors.length > 0) {
			throw new InvalidSchemaException('updated schema is not valid', updatedErrors)
		}

		const differs: (CreateDiff | Differ)[] = [
			ConvertOneToManyRelationModification.createDiff,

			RemoveUniqueConstraintModification.createDiff,
			new ChangeViewNonViewDiffer().createDiff,
			new RemoveChangedViewDiffer().createDiff,
			RemoveEntityModification.createDiff,
			RemoveFieldModification.createDiff,
			CreateEnumModification.createDiff,

			UpdateEntityTableNameModification.createDiff,
			UpdateColumnDefinitionModification.createDiff,
			UpdateColumnNameModification.createDiff,
			UpdateRelationOnDeleteModification.createDiff,
			MakeRelationNotNullModification.createDiff,
			MakeRelationNullableModification.createDiff,
			EnableOrphanRemovalModification.createDiff,
			DisableOrphanRemovalModification.createDiff,
			UpdateRelationOrderByModification.createDiff,
			UpdateEnumModification.createDiff,

			new RemoveChangedFieldDiffer(it => !isRelation(it) || isOwningRelation(it)),
			new RemoveChangedFieldDiffer(it => isRelation(it) && isInverseRelation(it)),
			CreateEntityModification.createDiff,
			CreateColumnModification.createDiff,
			CreateViewModification.createDiff,

			CreateRelationModification.createDiff,
			CreateRelationInverseSideModification.createDiff,

			CreateUniqueConstraintModification.createDiff,

			RemoveEnumModification.createDiff,

			UpdateAclSchemaModification.createDiff,
			PatchAclSchemaModification.createDiff,

			UpdateValidationSchemaModification.createDiff,
			PatchValidationSchemaModification.createDiff,
		].filter(isDefined)

		const diffs: Migration.Modification[] = []
		let appliedDiffsSchema = originalSchema
		for (const differ of differs) {
			const differDiffs = 'createDiff' in differ
				? differ.createDiff(appliedDiffsSchema, updatedSchema)
				: differ(appliedDiffsSchema, updatedSchema)
			appliedDiffsSchema = this.schemaMigrator.applyModifications(appliedDiffsSchema, differDiffs, VERSION_LATEST)
			diffs.push(...differDiffs)
		}

		if (checkRecreate && !deepEqual(updatedSchema, appliedDiffsSchema)) {
			const errors = deepCompare(updatedSchema, appliedDiffsSchema, [])
			let message = 'Updated schema cannot be recreated by the generated diff:'
			for (const err of errors) {
				message += '\n\t' + err.path.join('.') + ': ' + err.message
			}
			message += '\n\nPlease fill a bug report'
			throw new ImplementationException(message)
		}

		return diffs
	}
}

export class InvalidSchemaException extends Error {
	constructor(message: string, public readonly validationErrors: ValidationError[]) {
		super(message)
	}
}
