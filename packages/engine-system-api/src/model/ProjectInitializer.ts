import { unnamedIdentity } from './helpers/index.js'
import { ProjectConfig, StageConfig } from '../types.js'
import { ProjectMigrator, SchemaVersionBuilder } from './migrations/index.js'
import { StageCreator } from './stages/index.js'
import { DatabaseContext, DatabaseContextFactory } from './database/index.js'
import { SystemDbMigrationsRunnerFactory } from '../SystemContainer.js'
import {
	Connection,
	DatabaseCredentials,
	EventManagerImpl,
	retryTransaction,
	SingleConnection,
} from '@contember/database'
import { createDatabaseIfNotExists, createPgClient } from '@contember/database-migrations'
import { Logger } from '@contember/engine-common'
import { Migration } from '@contember/schema-migrations'

export class ProjectInitializer {
	constructor(
		private readonly projectMigrator: ProjectMigrator,
		private readonly stageCreator: StageCreator,
		private readonly systemDbMigrationsRunnerFactory: SystemDbMigrationsRunnerFactory,
		private readonly schemaVersionBuilder: SchemaVersionBuilder,
	) {}

	public async initialize(
		databaseContextFactory: DatabaseContextFactory,
		project: ProjectConfig & { db?: DatabaseCredentials },
		logger: Logger,
		migrations?: Migration[],
	) {
		const dbContext = databaseContextFactory.create(unnamedIdentity)
		if (project.db) {
			// todo: use dbContext
			logger.group(`Executing system schema migration`)
			await createDatabaseIfNotExists(project.db, logger.write.bind(logger))
			const pgClient = await createPgClient(project.db)
			await pgClient.connect()
			const singleConnection = new SingleConnection(pgClient, {}, new EventManagerImpl(), true)
			const dbContextMigrations = databaseContextFactory
				.withClient(singleConnection.createClient('system', { module: 'system' }))
				.create(unnamedIdentity)

			const schemaResolver = () => this.schemaVersionBuilder.buildSchema(dbContextMigrations)
			await this.systemDbMigrationsRunnerFactory(project.db, pgClient).migrate(
				logger.write.bind(logger),
				{
					schemaResolver,
					project,
					queryHandler: dbContextMigrations.queryHandler,
				},
			)
			await pgClient.end()
			logger.groupEnd()
		}
		return await retryTransaction(() =>
			dbContext.transaction(async trx => {
				await this.initStages(trx, project, logger, migrations)
			}),
		)
	}

	private async initStages(
		db: DatabaseContext<Connection.TransactionLike>,
		project: ProjectConfig,
		logger: Logger,
		migrations?: Migration[],
	) {

		logger.group(`Creating stages`)
		for (const stage of project.stages) {
			const created = await this.stageCreator.createStage(db, stage)
			if (created) {
				logger.write(`Created stage ${stage.slug} `)
			} else {
				logger.breadcrumb(`Updated stage ${stage.slug}`)
			}
		}

		logger.groupEnd()
		if (migrations) {
			logger.group(`Executing project migrations`)
			await this.projectMigrator.migrate(db, project, migrations, logger.write.bind(logger))
			logger.groupEnd()
		}
	}
}
