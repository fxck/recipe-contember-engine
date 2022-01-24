import { KoaMiddleware, KoaRequestState } from '../koa/index.js'
import { ProjectResolveMiddlewareState } from '../project-common/index.js'
import { StageConfig } from '../ProjectConfig.js'
import { AuthMiddlewareState, ErrorFactory } from '../common/index.js'

type InputKoaState =
	& ProjectResolveMiddlewareState
	& KoaRequestState
	& AuthMiddlewareState

type KoaState =
	& InputKoaState
	& StageResolveMiddlewareState

export interface StageResolveMiddlewareState {
	stage: StageConfig
}

export class StageResolveMiddlewareFactory {
	constructor(
		private errorFactory: ErrorFactory,
	) {
	}

	public create(): KoaMiddleware<KoaState> {
		const stageResolve: KoaMiddleware<KoaState> = (ctx, next) => {
			const project = ctx.state.projectContainer.project

			const stage = project.stages.find(stage => stage.slug === ctx.state.params.stageSlug)

			if (stage === undefined) {
				return this.errorFactory.createError(ctx, `Stage ${ctx.state.params.stageSlug} NOT found`, 404)
			}
			ctx.state.stage = stage
			return next()
		}
		return stageResolve
	}
}
