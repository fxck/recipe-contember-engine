import { DatabaseCredentials } from '@contember/database'
import pg from 'pg'
import { createDatabaseIfNotExists } from './helpers.js'
import { Migration } from './runner.js'

export class MigrationsRunner<MigrationArgs> {
	constructor(
		private readonly db: DatabaseCredentials,
		private readonly schema: string,
		private readonly migrations: () => Promise<Migration[]>,
		private readonly dbClient?: pg.Client,
	) {}

	public async migrate(
		log: (msg: string) => void,
		migrationArgs?: MigrationArgs,
	): Promise<{ name: string }[]> {
		await this.createDatabaseIfNotExists(log)

		const migrate = (await import('./runner.js')).default
		return await migrate(this.migrations, {
			schema: this.schema,
			migrationsTable: 'migrations',
			createSchema: true,
			migrationArgs,
			log,
			dbClient: this.dbClient ?? new pg.Client(this.db),
			shouldHandleConnection: !this.dbClient,
		})
	}

	private async createDatabaseIfNotExists(log: (msg: string) => void) {
		await createDatabaseIfNotExists(this.db, log)
	}
}
