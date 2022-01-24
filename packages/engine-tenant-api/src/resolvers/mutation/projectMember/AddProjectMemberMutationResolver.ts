import {
	AddProjectMemberErrorCode,
	AddProjectMemberResponse,
	MutationAddProjectMemberArgs,
	MutationResolvers,
} from '../../../schema/index.js'
import { ResolverContext } from '../../ResolverContext.js'
import { MembershipValidator, PermissionActions, ProjectManager, ProjectMemberManager } from '../../../model/index.js'
import { createMembershipValidationErrorResult } from '../../membershipUtils.js'
import { createErrorResponse, createProjectNotFoundResponse } from '../../errorUtils.js'

export class AddProjectMemberMutationResolver implements MutationResolvers {
	constructor(
		private readonly projectMemberManager: ProjectMemberManager,
		private readonly projectManager: ProjectManager,
		private readonly membershipValidator: MembershipValidator,
	) {}

	async addProjectMember(
		parent: any,
		{ projectSlug, identityId, memberships }: MutationAddProjectMemberArgs,
		context: ResolverContext,
	): Promise<AddProjectMemberResponse> {
		const project = await this.projectManager.getProjectBySlug(context.db, projectSlug)
		await context.requireAccess({
			scope: await context.permissionContext.createProjectScope(project),
			action: PermissionActions.PROJECT_ADD_MEMBER(memberships),
			message: 'You are not allowed to add a project member',
		})
		if (!project) {
			return createProjectNotFoundResponse(AddProjectMemberErrorCode.ProjectNotFound, projectSlug)
		}
		const validationResult = await this.membershipValidator.validate(context.projectGroup, project.slug, memberships)
		if (validationResult.length > 0) {
			const errors = createMembershipValidationErrorResult<AddProjectMemberErrorCode>(validationResult)
			return {
				ok: false,
				errors: errors,
				error: errors[0],
			}
		}

		const result = await this.projectMemberManager.addProjectMember(context.db, project.id, identityId, memberships)

		if (!result.ok) {
			return createErrorResponse(result.error, result.errorMessage)
		}

		return {
			ok: true,
			errors: [],
		}
	}
}
