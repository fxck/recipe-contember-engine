import { MigrationBuilder } from '@contember/database-migrations'
import { Model, Schema } from '@contember/schema'
import { SchemaUpdater, updateEntity, updateField, updateModel } from '../utils/schemaUpdateUtils.js'
import { ModificationHandlerStatic } from '../ModificationHandler.js'
import { updateColumns } from '../utils/diffUtils.js'

export const UpdateColumnNameModification: ModificationHandlerStatic<UpdateColumnNameModificationData> = class {
	static id = 'updateColumnName'
	constructor(private readonly data: UpdateColumnNameModificationData, private readonly schema: Schema) {}

	public createSql(builder: MigrationBuilder): void {
		const entity = this.schema.model.entities[this.data.entityName]
		if (entity.view) {
			return
		}
		const field = entity.fields[this.data.fieldName] as Model.AnyColumn
		builder.renameColumn(entity.tableName, field.columnName, this.data.columnName)
	}

	public getSchemaUpdater(): SchemaUpdater {
		return updateModel(
			updateEntity(
				this.data.entityName,
				updateField(this.data.fieldName, ({ field }) => ({ ...field, columnName: this.data.columnName })),
			),
		)
	}

	describe() {
		return { message: `Change column name of field ${this.data.entityName}.${this.data.fieldName}` }
	}

	static createModification(data: UpdateColumnNameModificationData) {
		return { modification: this.id, ...data }
	}

	static createDiff(originalSchema: Schema, updatedSchema: Schema) {
		return updateColumns(originalSchema, updatedSchema, ({ originalColumn, updatedColumn, updatedEntity }) => {
			if (originalColumn.columnName === updatedColumn.columnName) {
				return undefined
			}
			return UpdateColumnNameModification.createModification({
				entityName: updatedEntity.name,
				fieldName: updatedColumn.name,
				columnName: updatedColumn.columnName,
			})
		})
	}
}
export interface UpdateColumnNameModificationData {
	entityName: string
	fieldName: string
	columnName: string
}
