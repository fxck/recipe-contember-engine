import { Identity, QueryResolvers } from '../../schema/index.js'
import { ResolverContext } from '../ResolverContext.js'

export class MeQueryResolver implements QueryResolvers {
	me(parent: unknown, args: unknown, context: ResolverContext): Identity {
		return {
			id: context.identity.id,
			projects: [],
			person: null,
		}
	}
}
