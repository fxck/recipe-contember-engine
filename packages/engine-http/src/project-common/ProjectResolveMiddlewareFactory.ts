import { KoaMiddleware, KoaRequestState } from '../koa/index.js'
import { ProjectContainer, ProjectContainerResolver } from '../ProjectContainer.js'
import { ProjectConfig } from '../ProjectConfig.js'
import { AuthMiddlewareState, ErrorFactory } from '../common/index.js'
import { ProjectGroupState } from './ProjectGroupMiddleware.js'

type InputKoaState =
	& KoaRequestState
	& AuthMiddlewareState
	& ProjectGroupState

type KoaState =
	& InputKoaState
	& ProjectResolveMiddlewareState

export interface ProjectResolveMiddlewareState {
	project: ProjectConfig
	projectContainer: ProjectContainer
}

export class ProjectResolveMiddlewareFactory {
	constructor(
		private readonly projectContainerResolver: ProjectContainerResolver,
		private readonly errorFactory: ErrorFactory,
	) {
	}

	public create(): KoaMiddleware<KoaState> {
		const projectResolve: KoaMiddleware<KoaState> = async (ctx, next) => {
			const projectSlug = ctx.state.params.projectSlug
			const projectContainer = await this.projectContainerResolver.getProjectContainer(ctx.state.projectGroup, projectSlug, true)

			if (projectContainer === undefined) {
				return this.errorFactory.createError(ctx, `Project ${projectSlug} NOT found`, 404)
			}
			ctx.state.projectContainer = projectContainer
			ctx.state.project = projectContainer.project
			await next()
		}
		return projectResolve

	}
}
