import { ProjectResolveMiddlewareState } from '../project-common/index.js'
import { StageResolveMiddlewareState } from './StageResolveMiddlewareFactory.js'
import { KoaMiddleware } from '../koa/index.js'
import { LatestTransactionIdByStageQuery } from '@contember/engine-system-api'
import { TimerMiddlewareState } from '../common/index.js'

type InputKoaState =
	& ProjectResolveMiddlewareState
	& StageResolveMiddlewareState
	& TimerMiddlewareState

type KoaState = InputKoaState

export class NotModifiedMiddlewareFactory {
	public create(): KoaMiddleware<KoaState> {
		const notModified: KoaMiddleware<KoaState> = async (ctx, next) => {
			const NotModifiedHeaderName = 'x-contember-ref'
			if (ctx.request.headers[NotModifiedHeaderName] === undefined) {
				return next()
			}
			const requestRef = ctx.request.get(NotModifiedHeaderName)
			const body = ctx.request.body
			const isMutation = typeof body === 'object' && 'query' in body && String(body.query).includes('mutation')
			if (isMutation) {
				return await next()
			}
			const latestRef = await ctx.state.timer('NotModifiedCheck', () => {
				const db = ctx.state.projectContainer.systemDatabaseContextFactory.create(undefined)
				const queryHandler = db.queryHandler
				const stageSlug = ctx.state.stage.slug
				return queryHandler.fetch(new LatestTransactionIdByStageQuery(stageSlug))
			})
			if (latestRef === requestRef) {
				ctx.status = 304
				return
			}
			await next()
			if (ctx.status === 200) {
				ctx.response.set(NotModifiedHeaderName, latestRef)
			}
		}
		return notModified
	}
}
