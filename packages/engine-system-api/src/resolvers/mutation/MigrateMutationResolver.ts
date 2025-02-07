import { GraphQLResolveInfo } from 'graphql'
import { SystemResolverContext } from '../SystemResolverContext'
import { MutationResolver } from '../Resolver'
import { MigrateResponse, MutationMigrateArgs } from '../../schema'
import { Migration } from '@contember/schema-migrations'
import { AuthorizationActions, MigrationError, ProjectMigrator, StagesQuery } from '../../model'

const pg_lock_id = 1597474138739147

export class MigrateMutationResolver implements MutationResolver<'migrate'> {
	constructor(private readonly projectMigrator: ProjectMigrator) {}

	async migrateForce(
		parent: any,
		args: MutationMigrateArgs,
		context: SystemResolverContext,
		info: GraphQLResolveInfo,
	): Promise<MigrateResponse> {
		return this.migrate(parent, args, context, info, true)
	}

	async migrate(
		parent: any,
		args: MutationMigrateArgs,
		context: SystemResolverContext,
		info: GraphQLResolveInfo,
		force = false,
	): Promise<MigrateResponse> {
		const migrations = args.migrations as readonly Migration[]

		return context.db.locked(pg_lock_id, db => db.transaction(async trx => {
			const stages = await trx.queryHandler.fetch(new StagesQuery())
			for (const stage of stages) {
				await context.requireAccess(AuthorizationActions.PROJECT_MIGRATE, stage.slug)
			}
			try {
				await this.projectMigrator.migrate(trx, stages, migrations, {
					ignoreOrder: force,
					skipExecuted: true,
				})
			} catch (e) {
				if (e instanceof MigrationError) {
					await trx.client.connection.rollback()
					const error = {
						code: e.code,
						migration: e.version,
						developerMessage: e.message,
					}
					return {
						ok: false,
						errors: [error],
						error,
					}
				} else {
					throw e
				}
			}
			return {
				ok: true,
				errors: [],
			}
		}))
	}
}
