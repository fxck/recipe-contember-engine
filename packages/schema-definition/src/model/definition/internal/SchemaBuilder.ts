import { Model } from '@contember/schema'
import { NamingHelper } from '@contember/schema-utils'
import 'reflect-metadata'
import { tuple } from '../../../utils/index.js'
import { EntityConstructor, FieldsDefinition } from '../types.js'
import { NamingConventions } from '../NamingConventions.js'
import { EnumDefinition } from '../EnumDefinition.js'
import { EntityRegistry } from './EntityRegistry.js'
import { EnumRegistry } from './EnumRegistry.js'
import { ColumnDefinition } from '../fieldDefinitions/index.js'
import { applyEntityExtensions } from '../extensions.js'

export class SchemaBuilder {
	private entityRegistry = new EntityRegistry()

	private enumRegistry = new EnumRegistry()

	constructor(private readonly conventions: NamingConventions) {}

	public addEntity(name: string, entity: EntityConstructor): void {
		this.entityRegistry.register(name, entity)
	}

	public addEnum(name: string, definition: EnumDefinition): void {
		this.enumRegistry.register(name, definition)
	}

	public createSchema(): Model.Schema {
		const entities = Object.entries(this.entityRegistry.entities).map(([entityName, definition]): Model.Entity => {
			const definitionInstance: FieldsDefinition = new definition()

			const primaryName = this.conventions.getPrimaryField()
			const primaryField = this.createPrimaryColumn()

			const entity: Model.Entity = {
				name: entityName,
				primary: primaryName,
				primaryColumn: this.conventions.getColumnName(primaryName),
				unique: this.createUnique(entityName, definitionInstance),
				fields: [tuple(primaryName, primaryField), ...Object.entries(definitionInstance)]
					.map(([name, definition]) => {
						return definition.createField({
							name,
							entityName,
							conventions: this.conventions,
							enumRegistry: this.enumRegistry,
							entityRegistry: this.entityRegistry,
						})
					})
					.reduce<Model.Entity['fields']>((acc, field) => {
						if (acc[field.name]) {
							throw new Error(`Entity ${entityName}: field ${field.name} is already registered`)
						}
						return { ...acc, [field.name]: field }
					}, {}),
				tableName: this.conventions.getTableName(entityName),
			}
			return applyEntityExtensions(definition, { entity,  definition: definitionInstance, registry: this.entityRegistry })
		})

		return {
			enums: Object.entries(this.enumRegistry.enums).reduce((acc, [name, def]) => ({ ...acc, [name]: def.values }), {}),
			entities: entities.reduce((acc, entity) => ({ ...acc, [entity.name]: entity }), {}),
		}
	}

	private createPrimaryColumn(): ColumnDefinition {
		return new ColumnDefinition({
			nullable: false,
			type: Model.ColumnType.Uuid,
		})
	}

	private createUnique(entityName: string, fieldDefinitions: FieldsDefinition): Model.UniqueConstraints {
		const unique: Model.UniqueConstraints = {}
		for (const [fieldName, definition] of Object.entries(fieldDefinitions)) {
			if (definition.options.unique) {
				const uniqueName = NamingHelper.createUniqueConstraintName(entityName, [fieldName])
				unique[uniqueName] = { fields: [fieldName], name: uniqueName }
			}
		}
		return unique
	}
}
