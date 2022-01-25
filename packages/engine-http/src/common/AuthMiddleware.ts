import { ApiKeyManager, VerifyResult } from '@contember/engine-tenant-api'
import { KoaContext, KoaMiddleware } from '../koa/index.js'
import { TimerMiddlewareState } from './TimerMiddleware.js'
import { ErrorFactory } from './ErrorFactory.js'
import { ProjectGroupState } from '../project-common/index.js'

type InputState =
	& TimerMiddlewareState

type KoaState =
	& InputState
	& AuthMiddlewareState
	& ProjectGroupState

export interface AuthMiddlewareState {
	authResult: VerifyResult & { assumedIdentityId?: string }
}

const assumeIdentityHeader = 'x-contember-assume-identity'

export class AuthMiddlewareFactory {
	constructor(
		private readonly apiKeyManager: ApiKeyManager,
		private readonly errorFactory: ErrorFactory,
	) {
	}

	public create(): KoaMiddleware<KoaState> {
		const authError = (ctx: KoaContext<KoaState>, message: string) => this.errorFactory.createError(ctx, `Authorization failure: ${message}`, 401)
		const auth: KoaMiddleware<KoaState> = async (ctx, next) => {
			const authHeader = ctx.request.get('Authorization')
			if (typeof authHeader !== 'string' || authHeader === '') {
				return authError(ctx, `Authorization header is missing`)
			}

			const authHeaderPattern = /^Bearer\s+(\w+)$/i

			const match = authHeader.match(authHeaderPattern)
			if (match === null) {
				return authError(ctx, `invalid Authorization header format`)
			}
			const [, token] = match
			const tenantDatabase = ctx.state.projectGroup.database
			const authResult = await ctx.state.timer('Auth', () => this.apiKeyManager.verifyAndProlong(tenantDatabase, token))
			if (!authResult.ok) {
				return authError(ctx, authResult.errorMessage)
			}
			ctx.state.authResult = {
				...authResult.result,
				assumedIdentityId: ctx.request.get(assumeIdentityHeader) || undefined,
			}
			await next()
		}
		return auth
	}
}
