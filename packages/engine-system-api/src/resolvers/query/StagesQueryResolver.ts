import { GraphQLResolveInfo } from 'graphql'
import { ResolverContext } from '../ResolverContext.js'
import { QueryResolver } from '../Resolver.js'
import { Stage } from '../../schema/index.js'
import { StagesQuery } from '../../model/index.js'

export class StagesQueryResolver implements QueryResolver<'stages'> {
	async stages(parent: any, args: any, context: ResolverContext, info: GraphQLResolveInfo): Promise<Stage[]> {
		return context.db.queryHandler.fetch(new StagesQuery())
	}
}
