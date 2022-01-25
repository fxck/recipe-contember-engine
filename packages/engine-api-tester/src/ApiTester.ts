import {
	DatabaseContextFactory,
	ProjectConfig,
	SystemContainer,
	SystemContainerFactory,
	typeDefs as systemTypeDefs,
	unnamedIdentity,
} from '@contember/engine-system-api'
import { MigrationFilesManager, MigrationsResolver, ModificationHandlerFactory } from '@contember/schema-migrations'
import {
	createMapperContainer,
	EntitiesSelector,
	EntitiesSelectorMapperFactory,
	GraphQlSchemaBuilderFactory,
	PermissionsByIdentityFactory,
} from '@contember/engine-content-api'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { ContentApiTester } from './ContentApiTester.js'
import { SystemApiTester } from './SystemApiTester.js'
import { TesterStageManager } from './TesterStageManager.js'
import { Client, EventManagerImpl, SingleConnection, DatabaseCredentials } from '@contember/database'
import { createUuidGenerator } from './testUuid.js'
import { project } from './project.js'
import { createConnection, dbCredentials, recreateDatabase } from './dbUtils.js'
import { dirname, join } from 'path'
import { createPgClient, MigrationsRunner } from '@contember/database-migrations'
import  pg from 'pg'
import { getSystemMigrations } from '@contember/engine-system-api'
import { fileURLToPath } from 'url'


export class ApiTester {
	public static project = project

	constructor(
		public readonly client: Client,
		public readonly databaseContextFactory: DatabaseContextFactory,
		public readonly systemContainer: SystemContainer,
		public readonly content: ContentApiTester,
		public readonly system: SystemApiTester,
		public readonly stages: TesterStageManager,
		public readonly cleanup: () => Promise<void>,
	) {}

	public static async create(options: {
		project?: Partial<ProjectConfig>
		migrationsResolver?: MigrationsResolver
		systemContainerHook?: (
			container: ReturnType<SystemContainerFactory['createBuilder']>,
		) => ReturnType<SystemContainerFactory['createBuilder']>
	}): Promise<ApiTester> {
		const dbName = String(process.env.TEST_DB_NAME)

		const projectConnection = createConnection(dbName)
		const providers = { uuid: createUuidGenerator('a452'), now: () => new Date('2019-09-04 12:00') }
		const databaseContextFactory = new DatabaseContextFactory(projectConnection.createClient('system', {}), providers)

		// await setupSystemVariables(projectDb, unnamedIdentity, { uuid: createUuidGenerator('a450') })

		const modificationHandlerFactory = new ModificationHandlerFactory(ModificationHandlerFactory.defaultFactoryMap)
		const gqlSchemaBuilderFactory = new GraphQlSchemaBuilderFactory()

		const systemContainerFactory = new SystemContainerFactory()
		const projectSlug = options.project?.slug || ApiTester.project.slug
		const migrationFilesManager = MigrationFilesManager.createForProject(ApiTester.getMigrationsDir(), projectSlug)
		const migrationsResolver = options.migrationsResolver || new MigrationsResolver(migrationFilesManager)
		const permissionsByIdentityFactory = new PermissionsByIdentityFactory()
		const mapperFactory: EntitiesSelectorMapperFactory = (db, schema, identityVariables, permissions) =>
			createMapperContainer({ schema, identityVariables, permissions, providers }).mapperFactory(db)
		let systemContainerBuilder = systemContainerFactory.createBuilder({
			entitiesSelector: new EntitiesSelector(mapperFactory, permissionsByIdentityFactory),
			modificationHandlerFactory,
			providers: providers,
			identityFetcher: {
				fetchIdentities: () => {
					return Promise.resolve([])
				},
			},
			systemDbMigrationsRunnerFactory: (db: DatabaseCredentials, dbClient: pg.Client) =>
				new MigrationsRunner(db, 'system', getSystemMigrations, dbClient),
		})
		if (options.systemContainerHook) {
			systemContainerBuilder = options.systemContainerHook(systemContainerBuilder)
		}
		const systemContainer = systemContainerBuilder.build()

		const connection = await recreateDatabase(dbName)
		await connection.end()

		const projectConfig = { ...ApiTester.project, ...options.project }

		const db = databaseContextFactory.create(unnamedIdentity)

		const pgClient = await createPgClient(dbCredentials(dbName))
		await pgClient.connect()
		const singleConnection = new SingleConnection(pgClient, {}, new EventManagerImpl(), true)
		const dbContextMigrations = databaseContextFactory
			.withClient(singleConnection.createClient('system', {}))
			.create(unnamedIdentity)

		const schemaResolver = () => systemContainer.schemaVersionBuilder.buildSchema(dbContextMigrations)
		await systemContainer
			.systemDbMigrationsRunnerFactory(dbCredentials(dbName), pgClient)
			.migrate(() => null, {
				schemaResolver,
				project: projectConfig,
				queryHandler: null as any,
			})
		await pgClient.end()

		const systemSchema = makeExecutableSchema({
			typeDefs: systemTypeDefs,
			resolvers: systemContainer.get('systemResolversFactory').create(false) as any,
		})

		const stageManager = new TesterStageManager(
			projectConfig,
			db,
			systemContainer.stageCreator,
			systemContainer.projectMigrator,
			migrationsResolver,
		)

		const contentApiTester = new ContentApiTester(
			db,
			gqlSchemaBuilderFactory,
			stageManager,
			systemContainer.schemaVersionBuilder,
		)
		const systemApiTester = new SystemApiTester(db, projectConfig, systemSchema, systemContainer)
		let closed = false

		return new ApiTester(
			db.client,
			databaseContextFactory,
			systemContainer,
			contentApiTester,
			systemApiTester,
			stageManager,
			async () => {
				if (!closed) {
					await projectConnection.end()
					closed = true
				}
			},
		)
	}

	public static getMigrationsDir(): string {
		return join(dirname(fileURLToPath(import.meta.url)), '/../../src')
	}
}
