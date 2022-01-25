import { GraphQLResolveInfo } from 'graphql'
import { ResolverContext } from '../ResolverContext.js'
import { QueryResolver } from '../Resolver.js'
import { ExecutedMigration, QueryExecutedMigrationsArgs } from '../../schema/index.js'
import { ExecutedMigrationByVersionQuery, ExecutedMigrationsQuery } from '../../model/index.js'

export class ExecutedMigrationsQueryResolver implements QueryResolver<'executedMigrations'> {
	async executedMigrations(
		parent: any,
		args: QueryExecutedMigrationsArgs,
		context: ResolverContext,
		info: GraphQLResolveInfo,
	): Promise<ExecutedMigration[]> {
		if (args.version) {
			const migration = await context.db.queryHandler.fetch(new ExecutedMigrationByVersionQuery(args.version))
			return migration ? [migration] : []
		}
		return await context.db.queryHandler.fetch(new ExecutedMigrationsQuery())
	}
}
