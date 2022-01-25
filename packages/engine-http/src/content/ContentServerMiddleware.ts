import { KoaMiddleware } from '../koa/index.js'
import { ProjectMemberMiddlewareState, ProjectResolveMiddlewareState } from '../project-common/index.js'
import { AuthMiddlewareState, TimerMiddlewareState } from '../common/index.js'
import { Client } from '@contember/database'
import { formatSchemaName, unnamedIdentity } from '@contember/engine-system-api'
import { StageResolveMiddlewareState } from './StageResolveMiddlewareFactory.js'

type InputKoaState =
	& ProjectMemberMiddlewareState
	& TimerMiddlewareState
	& ProjectResolveMiddlewareState
	& StageResolveMiddlewareState
	& AuthMiddlewareState

type KoaState =
	& InputKoaState
	& ContentServerMiddlewareState

export interface ContentServerMiddlewareState {
	db: Client
}

export class ContentServerMiddlewareFactory {
	public create(): KoaMiddleware<KoaState> {
		const contentServer: KoaMiddleware<KoaState> = async (ctx, next) => {
			const projectRoles = ctx.state.projectMemberships.map(it => it.role)
			const stage = ctx.state.stage
			const projectContainer = ctx.state.projectContainer
			const dbContextFactory = ctx.state.projectContainer.systemDatabaseContextFactory
			const dbClient = projectContainer.connection.createClient(formatSchemaName(stage), { module: 'content' })
			ctx.state.db = dbClient
			const handler = await ctx.state.timer('GraphQLServerCreate', () =>
				projectContainer.contentQueryHandlerProvider.get(dbContextFactory.create(unnamedIdentity), stage, projectRoles),
			)

			await ctx.state.timer('GraphQL', () => handler(ctx, next))
		}
		return contentServer
	}
}
