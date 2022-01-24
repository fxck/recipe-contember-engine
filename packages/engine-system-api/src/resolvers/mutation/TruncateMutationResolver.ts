import { GraphQLResolveInfo } from 'graphql'
import { ResolverContext } from '../ResolverContext.js'
import { MutationResolver } from '../Resolver.js'
import { TruncateResponse } from '../../schema/index.js'
import { ProjectTruncateExecutor } from '../../model/index.js'

export class TruncateMutationResolver implements MutationResolver<'truncate'> {
	constructor(private readonly projectTruncateExecutor: ProjectTruncateExecutor) {}
	async truncate(
		parent: any,
		args: any,
		context: ResolverContext,
		info: GraphQLResolveInfo,
	): Promise<TruncateResponse> {
		await this.projectTruncateExecutor.truncateProject(context.db, context.project, context.schema)
		return {
			ok: true,
		}
	}
}
