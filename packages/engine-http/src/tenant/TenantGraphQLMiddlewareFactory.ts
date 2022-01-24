import { makeExecutableSchema } from '@graphql-tools/schema'
import { ResolverContextFactory, Schema, typeDefs, ResolverContext } from '@contember/engine-tenant-api'
import { AuthMiddlewareState } from '../common/index.js'
import { KoaContext, KoaMiddleware } from '../koa/index.js'
import { createGraphQLQueryHandler, createGraphqlRequestInfoProviderListener, GraphQLKoaState, createErrorListener, ErrorLogger } from '../graphql/index.js'
import { ProjectGroupState } from '../project-common/index.js'

type KoaState =
	& ProjectGroupState
	& AuthMiddlewareState
	& GraphQLKoaState

export type TenantGraphQLContext = ResolverContext & {
	koaContext: KoaContext<KoaState>
}

export class TenantGraphQLMiddlewareFactory {
	constructor(
		private readonly resolvers: Schema.Resolvers,
		private readonly resolverContextFactory: ResolverContextFactory,
		private readonly errorLogger: ErrorLogger,
	) {}

	create(): KoaMiddleware<KoaState> {
		const schema = makeExecutableSchema({
			typeDefs,
			resolvers: this.resolvers,
			resolverValidationOptions: { requireResolversForResolveType: 'ignore' },
		})
		return createGraphQLQueryHandler<TenantGraphQLContext, KoaState>({
			schema,
			contextFactory: ctx => {
				const context = this.resolverContextFactory.create(ctx.state.authResult, ctx.state.projectGroup)
				return {
					...context,
					koaContext: ctx,
				}
			},
			listeners: [
				createErrorListener((err, ctx) => {
					this.errorLogger(err, {
						body: ctx.koaContext.request.body as string,
						url: ctx.koaContext.request.originalUrl,
						user: ctx.koaContext.state.authResult.identityId,
						module: 'tenant',
						project: undefined,
					})
				}),
				createGraphqlRequestInfoProviderListener(),
			],
		})
	}
}
