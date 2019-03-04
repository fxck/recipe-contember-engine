import ProjectMemberManager from '../tenant-api/model/service/ProjectMemberManager'
import { KoaMiddleware } from '../core/koa/types'
import AuthMiddlewareFactory from './AuthMiddlewareFactory'
import ProjectResolveMiddlewareFactory from './ProjectResolveMiddlewareFactory'

type InputState = ProjectMemberMiddlewareFactory.KoaState &
	AuthMiddlewareFactory.KoaState &
	ProjectResolveMiddlewareFactory.KoaState
class ProjectMemberMiddlewareFactory {
	constructor(private readonly projectMemberManager: ProjectMemberManager) {}

	public create(): KoaMiddleware<InputState> {
		const projectMember: KoaMiddleware<InputState> = async (ctx, next) => {
			const project = ctx.state.projectContainer.project
			const [projectRoles, projectVariables] = await Promise.all([
				this.projectMemberManager.getProjectRoles(project.uuid, ctx.state.authResult.identityId),
				this.projectMemberManager.getProjectVariables(project.uuid, ctx.state.authResult.identityId),
			])
			ctx.state.projectRoles = projectRoles.roles
			ctx.state.projectVariables = projectVariables
			await next()
		}
		return projectMember
	}
}

namespace ProjectMemberMiddlewareFactory {
	export interface KoaState {
		projectRoles: string[]
		projectVariables: { [name: string]: string[] }
	}
}

export default ProjectMemberMiddlewareFactory
