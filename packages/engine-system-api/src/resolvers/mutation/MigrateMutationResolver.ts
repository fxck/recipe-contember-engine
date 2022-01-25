import { GraphQLResolveInfo } from 'graphql'
import { ResolverContext } from '../ResolverContext.js'
import { MutationResolver } from '../Resolver.js'
import { MigrateResponse, MutationMigrateArgs } from '../../schema/index.js'
import { Migration } from '@contember/schema-migrations'
import { AuthorizationActions, MigrationError, ProjectMigrator } from '../../model/index.js'

export class MigrateMutationResolver implements MutationResolver<'migrate'> {
	constructor(private readonly projectMigrator: ProjectMigrator) {}

	async migrateForce(
		parent: any,
		args: MutationMigrateArgs,
		context: ResolverContext,
		info: GraphQLResolveInfo,
	): Promise<MigrateResponse> {
		return this.migrate(parent, args, context, info, true)
	}

	async migrate(
		parent: any,
		args: MutationMigrateArgs,
		context: ResolverContext,
		info: GraphQLResolveInfo,
		force = false,
	): Promise<MigrateResponse> {
		for (const stage of context.project.stages) {
			await context.requireAccess(AuthorizationActions.PROJECT_MIGRATE, stage.slug)
		}
		const migrations = args.migrations as readonly Migration[]

		return context.db.transaction(async trx => {
			try {
				await this.projectMigrator.migrate(trx, context.project, migrations, () => null, force)
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
		})
	}
}
