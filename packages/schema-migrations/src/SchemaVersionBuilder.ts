import { Schema } from '@contember/schema'
import { emptySchema } from '@contember/schema-utils'
import { SchemaMigrator } from './SchemaMigrator'
import { MigrationsResolver } from './MigrationsResolver'

export class SchemaVersionBuilder {
	constructor(
		private readonly migrationsResolver: MigrationsResolver,
		private readonly schemaMigrator: SchemaMigrator,
	) {}

	async buildSchema(targetVersion?: string): Promise<Schema> {
		return this.doBuild(emptySchema, version => !targetVersion || version <= targetVersion)
	}

	async buildSchemaUntil(targetVersion: string): Promise<Schema> {
		return this.doBuild(emptySchema, version => version < targetVersion)
	}

	async continue(schema: Schema, previousVersion: string | null, targetVersion: string): Promise<Schema> {
		return this.doBuild(schema, version => version <= targetVersion && version > (previousVersion || ''))
	}

	private async doBuild(initialSchema: Schema, condition: (version: string) => boolean): Promise<Schema> {
		return (await this.migrationsResolver.getMigrations())
			.filter(({ version }) => condition(version))
			.map(({ modifications }) => modifications)
			.reduce<Schema>((schema, modifications) => this.schemaMigrator.applyDiff(schema, modifications), initialSchema)
	}
}
