import { AccessEvaluator, Authorizator } from '@contember/authorization'
import { Builder, Container } from '@contember/dic'
import {
	MigrationDescriber,
	ModificationHandlerFactory,
	SchemaDiffer,
	SchemaMigrator,
} from '@contember/schema-migrations'
import { MigrationsRunner } from '@contember/database-migrations'
import { DatabaseCredentials } from '@contember/database'
import {
	EntitiesSelector,
	EventResponseBuilder,
	ExecutedMigrationsResolver,
	IdentityFetcher,
	MigrationAlterer,
	MigrationExecutor,
	PermissionsFactory,
	ProjectInitializer,
	ProjectMigrator,
	ProjectTruncateExecutor,
	SchemaVersionBuilder,
	StageCreator,
} from './model/index.js'
import { UuidProvider } from './utils/index.js'
import {
	EventsQueryResolver,
	ExecutedMigrationsQueryResolver,
	MigrateMutationResolver,
	MigrationAlterMutationResolver,
	ResolverContextFactory,
	ResolverFactory,
	StagesQueryResolver,
	TruncateMutationResolver,
} from './resolvers/index.js'
import  pg from 'pg'
import { SystemMigrationArgs } from './migrations/types.js'
import { EventOldValuesResolver } from './resolvers/types/index.js'

export interface SystemContainer {
	systemResolversFactory: ResolverFactory
	authorizator: Authorizator
	resolverContextFactory: ResolverContextFactory
	schemaVersionBuilder: SchemaVersionBuilder
	projectInitializer: ProjectInitializer
	systemDbMigrationsRunnerFactory: SystemDbMigrationsRunnerFactory
}

export type SystemDbMigrationsRunnerFactory = (db: DatabaseCredentials, dbClient: pg.Client) => MigrationsRunner<SystemMigrationArgs>

type Args = {
	providers: UuidProvider
	modificationHandlerFactory: ModificationHandlerFactory
	entitiesSelector: EntitiesSelector
	systemDbMigrationsRunnerFactory: (db: DatabaseCredentials, dbClient: pg.Client) => MigrationsRunner<SystemMigrationArgs>
	identityFetcher: IdentityFetcher
}

export class SystemContainerFactory {
	public create(container: Args): Container<SystemContainer> {
		return this.createBuilder(container)
			.build()
			.pick(
				'systemResolversFactory',
				'authorizator',
				'resolverContextFactory',
				'schemaVersionBuilder',
				'projectInitializer',
				'systemDbMigrationsRunnerFactory',
			)
	}
	public createBuilder(container: Args) {
		return new Builder({})
			.addService('systemDbMigrationsRunnerFactory', () =>
				container.systemDbMigrationsRunnerFactory)
			.addService('modificationHandlerFactory', () =>
				container.modificationHandlerFactory)
			.addService('identityFetcher', () =>
				container.identityFetcher)
			.addService('schemaMigrator', ({ modificationHandlerFactory }) =>
				new SchemaMigrator(modificationHandlerFactory))
			.addService('executedMigrationsResolver', ({}) =>
				new ExecutedMigrationsResolver())
			.addService('schemaVersionBuilder', ({ executedMigrationsResolver, schemaMigrator }) =>
				new SchemaVersionBuilder(executedMigrationsResolver, schemaMigrator))
			.addService('providers', () =>
				container.providers)
			.addService('accessEvaluator', ({}) =>
				new AccessEvaluator.PermissionEvaluator(new PermissionsFactory().create()))
			.addService('authorizator', ({ accessEvaluator }): Authorizator =>
				new Authorizator.Default(accessEvaluator))
			.addService('schemaDiffer', ({ schemaMigrator }) =>
				new SchemaDiffer(schemaMigrator))
			.addService('migrationExecutor', ({ modificationHandlerFactory }) =>
				new MigrationExecutor(modificationHandlerFactory))
			.addService('migrationDescriber', ({ modificationHandlerFactory }) =>
				new MigrationDescriber(modificationHandlerFactory))
			.addService('projectMigrator', ({ migrationDescriber, schemaVersionBuilder, executedMigrationsResolver }) =>
				new ProjectMigrator(migrationDescriber, schemaVersionBuilder, executedMigrationsResolver))
			.addService('stageCreator', () =>
				new StageCreator())
			.addService('projectTruncateExecutor', () =>
				new ProjectTruncateExecutor())
			.addService('migrationAlterer', () =>
				new MigrationAlterer())
			.addService('eventResponseBuilder', ({ identityFetcher }) =>
				new EventResponseBuilder(identityFetcher))
			.addService('stagesQueryResolver', () =>
				new StagesQueryResolver())
			.addService('executedMigrationsQueryResolver', () =>
				new ExecutedMigrationsQueryResolver())
			.addService('migrateMutationResolver', ({ projectMigrator }) =>
				new MigrateMutationResolver(projectMigrator))
			.addService('truncateMutationResolver', ({ projectTruncateExecutor }) =>
				new TruncateMutationResolver(projectTruncateExecutor))
			.addService('migrationAlterMutationResolver', ({ migrationAlterer }) =>
				new MigrationAlterMutationResolver(migrationAlterer))
			.addService('eventsQueryResolver', ({ eventResponseBuilder }) =>
				new EventsQueryResolver(eventResponseBuilder))
			.addService('eventOldValuesResolver', () =>
				new EventOldValuesResolver())
			.addService('systemResolversFactory', ({ stagesQueryResolver, executedMigrationsQueryResolver, migrateMutationResolver, truncateMutationResolver, migrationAlterMutationResolver, eventsQueryResolver, eventOldValuesResolver }) =>
				new ResolverFactory(stagesQueryResolver, executedMigrationsQueryResolver, migrateMutationResolver, truncateMutationResolver, migrationAlterMutationResolver, eventsQueryResolver, eventOldValuesResolver))
			.addService('resolverContextFactory', ({ authorizator, schemaVersionBuilder }) =>
				new ResolverContextFactory(authorizator, schemaVersionBuilder))
			.addService('projectInitializer', ({ projectMigrator, stageCreator, systemDbMigrationsRunnerFactory, schemaVersionBuilder }) =>
				new ProjectInitializer(projectMigrator, stageCreator, systemDbMigrationsRunnerFactory, schemaVersionBuilder),
			)
	}
}
