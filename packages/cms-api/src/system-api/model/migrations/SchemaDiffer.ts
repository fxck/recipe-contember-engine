import { deepCopy, Model, Schema } from 'cms-common'
import { acceptFieldVisitor } from '../../../content-schema/modelUtils'
import ImplementationException from '../../../core/exceptions/ImplementationException'
import SchemaMigrator from '../../../content-schema/differ/SchemaMigrator'
import ModificationBuilder from './modifications/ModificationBuilder'
import Migration from './Migration'
import { isIt } from '../../../utils/type'
import { createPatch } from 'rfc6902'
import deepEqual = require('fast-deep-equal')

class SchemaDiffer {
	constructor(private readonly schemaMigrator: SchemaMigrator) {}

	diffSchemas(originalSchema: Schema, updatedSchema: Schema, checkRecreate: boolean = true): Migration.Modification[] {
		const builder = new ModificationBuilder(updatedSchema)

		if (!deepEqual(originalSchema.acl, updatedSchema.acl)) {
			const patch = createPatch(originalSchema.acl, updatedSchema.acl)
			if (patch.length <= 20) {
				builder.patchAclSchema(patch)
			} else {
				builder.updateAclSchema(updatedSchema.acl)
			}
		}

		const originalModel = originalSchema.model
		const updatedModel = updatedSchema.model

		const originalEnums = new Set(Object.keys(originalModel.enums))

		for (const enumName in updatedModel.enums) {
			if (!originalEnums.has(enumName)) {
				builder.createEnum(enumName)
				continue
			}
			if (!deepEqual(updatedModel.enums[enumName], originalModel.enums[enumName])) {
				builder.updateEnum(enumName)
			}
			originalEnums.delete(enumName)
		}

		for (const entityName in updatedModel.entities) {
			const updatedEntity: Model.Entity = updatedModel.entities[entityName]
			const originalEntity: Model.Entity | undefined = originalModel.entities[entityName]

			if (!originalEntity) {
				builder.createEntity(updatedEntity)
				for (const fieldName in updatedEntity.fields) {
					if (fieldName === updatedEntity.primary) {
						continue
					}
					builder.createField(updatedEntity, fieldName)
				}
				for (const uniqueName in updatedEntity.unique) {
					builder.createUnique(updatedEntity, uniqueName)
				}
				continue
			}

			this.trackUniqueConstraintDiff(builder, originalEntity, updatedEntity)

			if (updatedEntity.tableName !== originalEntity.tableName) {
				builder.updateEntityTableName(entityName, updatedEntity.tableName)
			}

			const tryPartialUpdate = (updatedRelation: Model.AnyRelation, originalRelation: Model.AnyRelation): boolean => {
				if (updatedRelation.type !== originalRelation.type) {
					return false
				}
				const marker = builder.createMarker()
				const tmpRelation = deepCopy(originalRelation)
				if (
					isIt<Model.JoiningColumnRelation>(updatedRelation, 'joiningColumn') &&
					isIt<Model.JoiningColumnRelation>(originalRelation, 'joiningColumn') &&
					updatedRelation.joiningColumn.onDelete !== originalRelation.joiningColumn.onDelete
				) {
					;(tmpRelation as Model.AnyRelation & Model.JoiningColumnRelation).joiningColumn.onDelete =
						updatedRelation.joiningColumn.onDelete
					builder.updateRelationOnDelete(entityName, updatedRelation.name, updatedRelation.joiningColumn.onDelete)
				}

				if (!deepEqual(tmpRelation, updatedRelation)) {
					marker.rewind()
					return false
				}

				return true
			}

			const originalFields = new Set(Object.keys(originalEntity.fields))
			for (const fieldName in updatedEntity.fields) {
				if (!originalFields.has(fieldName)) {
					builder.createField(updatedEntity, fieldName)
					continue
				}
				originalFields.delete(fieldName)

				acceptFieldVisitor(updatedModel, updatedEntity, fieldName, {
					visitColumn: ({}, updatedColumn: Model.AnyColumn) => {
						acceptFieldVisitor(originalModel, originalEntity, fieldName, {
							visitColumn: ({}, originalColumn: Model.AnyColumn) => {
								if (updatedColumn.columnName != originalColumn.columnName) {
									builder.updateColumnName(entityName, fieldName, updatedColumn.columnName)
								}
								const updatedDefinition = Model.getColumnDefinition(updatedColumn)
								const originalDefinition = Model.getColumnDefinition(originalColumn)
								if (!deepEqual(updatedDefinition, originalDefinition)) {
									builder.updateColumnDefinition(entityName, fieldName, updatedDefinition)
								}
							},
							visitRelation: () => {
								builder.removeField(entityName, fieldName)
								builder.createField(updatedEntity, fieldName)
							},
						})
					},
					visitRelation: ({}, updatedRelation: Model.AnyRelation, {}, _) => {
						acceptFieldVisitor(originalModel, originalEntity, fieldName, {
							visitColumn: () => {
								builder.removeField(entityName, fieldName)
								builder.createField(updatedEntity, fieldName)
							},
							visitRelation: ({}, originalRelation: Model.AnyRelation, {}, _) => {
								if (
									deepEqual(
										{ ...updatedRelation, inversedBy: undefined },
										{ ...originalRelation, inversedBy: undefined }
									)
								) {
									return
								}
								const partialUpdateResult = tryPartialUpdate(updatedRelation, originalRelation)

								if (!partialUpdateResult) {
									builder.removeField(entityName, fieldName)
									builder.createField(updatedEntity, fieldName)
								}
							},
						})
					},
				})
			}

			for (const fieldName of originalFields) {
				acceptFieldVisitor(originalSchema.model, entityName, fieldName, {
					visitColumn: () => {
						builder.removeField(entityName, fieldName)
					},
					visitManyHasOne: () => {
						builder.removeField(entityName, fieldName)
					},
					visitOneHasMany: () => {
						builder.removeField(entityName, fieldName, true)
					},
					visitOneHasOneOwner: () => {
						builder.removeField(entityName, fieldName)
					},
					visitOneHasOneInversed: () => {
						builder.removeField(entityName, fieldName, true)
					},
					visitManyHasManyOwner: () => {
						builder.removeField(entityName, fieldName)
					},
					visitManyHasManyInversed: () => {
						builder.removeField(entityName, fieldName, true)
					},
				})
			}
		}

		const entitiesToDelete = Object.keys(originalModel.entities).filter(name => !updatedModel.entities[name])
		for (const entityName of entitiesToDelete) {
			builder.removeEntity(entityName)
		}

		const enumsToDelete = Object.keys(originalModel.enums).filter(name => !updatedModel.enums[name])
		for (const enumName of enumsToDelete) {
			builder.removeEnum(enumName)
		}

		const diff = builder.getDiff()

		const appliedDiff = this.schemaMigrator.applyDiff(originalSchema, diff)

		if (checkRecreate && !deepEqual(updatedSchema, appliedDiff)) {
			throw new ImplementationException('Updated schema cannot be recreated by the generated diff!')
		}

		return diff
	}

	private trackUniqueConstraintDiff(
		builder: ModificationBuilder,
		originalEntity: Model.Entity,
		updatedEntity: Model.Entity
	) {
		const originalUnique = originalEntity.unique
		const originalUniqueNames = new Set(Object.keys(originalUnique))

		for (const uniqueName in updatedEntity.unique) {
			if (
				originalUniqueNames.has(uniqueName) &&
				!deepEqual(updatedEntity.unique[uniqueName], originalUnique[uniqueName])
			) {
				builder.removeUnique(updatedEntity.name, uniqueName)
				originalUniqueNames.delete(uniqueName)
			}
			if (!originalUniqueNames.has(uniqueName)) {
				builder.createUnique(updatedEntity, uniqueName)
			}
			originalUniqueNames.delete(uniqueName)
		}

		for (const uniqueName of originalUniqueNames) {
			builder.removeUnique(updatedEntity.name, uniqueName)
		}
	}
}

export default SchemaDiffer
