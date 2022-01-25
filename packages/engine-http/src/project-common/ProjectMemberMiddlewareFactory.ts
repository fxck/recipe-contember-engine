import { KoaMiddleware } from '../koa/index.js'
import { ProjectResolveMiddlewareState } from './ProjectResolveMiddlewareFactory.js'
import { AuthMiddlewareState, ErrorFactory, TimerMiddlewareState } from '../common/index.js'
import { ProjectMemberManager } from '@contember/engine-tenant-api'
import { ProjectGroupState } from './ProjectGroupMiddleware.js'

type InputKoaState =
	& AuthMiddlewareState
	& ProjectResolveMiddlewareState
	& TimerMiddlewareState
	& ProjectGroupState

type KoaState =
	& InputKoaState
	& ProjectMemberMiddlewareState

export interface ProjectMemberMiddlewareState {
	projectMemberships: readonly { role: string; variables: readonly { name: string; values: readonly string[] }[] }[]
}

export class ProjectMemberMiddlewareFactory {
	constructor(
		private readonly debug: boolean,
		private readonly projectMemberManager: ProjectMemberManager,
		private readonly errorFactory: ErrorFactory,
	) {
	}

	public create(): KoaMiddleware<KoaState> {
		const projectMember: KoaMiddleware<KoaState> = async (ctx, next) => {
			const project = ctx.state.project
			const projectMemberships = await ctx.state.timer('MembershipFetch', () =>
				this.projectMemberManager.getProjectMemberships(
					ctx.state.projectGroup.database,
					{ slug: project.slug },
					{
						id: ctx.state.authResult.identityId,
						roles: ctx.state.authResult.roles,
					},
					undefined,
				),
			)
			if (projectMemberships.length === 0) {
				return this.debug
					? this.errorFactory.createError(ctx, `You are not allowed to access project ${project.slug}`, 403)
					: this.errorFactory.createError(ctx, `Project ${project.slug} NOT found`, 404)
			}
			ctx.state.projectMemberships = projectMemberships
			await next()
		}
		return projectMember
	}
}
