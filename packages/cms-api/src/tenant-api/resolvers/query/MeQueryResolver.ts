import { Identity, QueryResolvers } from '../../schema/types'
import { GraphQLResolveInfo } from 'graphql'
import ResolverContext from '../ResolverContext'
import QueryHandler from '../../../core/query/QueryHandler'
import KnexQueryable from '../../../core/knex/KnexQueryable'
import ProjectsByIdentityQuery from '../../model/queries/ProjectsByIdentityQuery'
import PersonByIdentityQuery from '../../model/queries/PersonByIdentityQuery'

export default class MeQueryResolver implements QueryResolvers.Resolvers {
	constructor(private readonly queryHandler: QueryHandler<KnexQueryable>) {}

	async me(parent: any, args: any, context: ResolverContext, info: GraphQLResolveInfo): Promise<Identity> {
		const identityId = context.identity.id
		const [personRow, projectRows] = await Promise.all([
			this.queryHandler.fetch(new PersonByIdentityQuery(identityId)),
			this.queryHandler.fetch(new ProjectsByIdentityQuery(identityId)),
		])

		return {
			id: identityId,
			projects: projectRows,
			person: personRow
				? {
						id: personRow.id,
						email: personRow.email,
				  }
				: null,
		}
	}
}
