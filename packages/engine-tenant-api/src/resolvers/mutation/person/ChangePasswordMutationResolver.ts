import {
	ChangeMyPasswordErrorCode,
	ChangeMyPasswordResponse,
	ChangePasswordErrorCode,
	ChangePasswordResponse,
	MutationChangeMyPasswordArgs,
	MutationChangePasswordArgs,
	MutationResolvers,
} from '../../../schema/index.js'
import { GraphQLResolveInfo } from 'graphql'
import { ResolverContext } from '../../ResolverContext.js'
import { DatabaseContext, IdentityScope, PasswordChangeManager, PermissionActions, PersonQuery } from '../../../model/index.js'
import { createErrorResponse } from '../../errorUtils.js'

export class ChangePasswordMutationResolver implements MutationResolvers {
	constructor(
		private readonly passwordChangeManager: PasswordChangeManager,
	) {}

	async changePassword(
		parent: unknown,
		args: MutationChangePasswordArgs,
		context: ResolverContext,
		info: GraphQLResolveInfo,
	): Promise<ChangePasswordResponse> {
		const person = await context.db.queryHandler.fetch(PersonQuery.byId(args.personId))
		if (!person) {
			return createErrorResponse(ChangePasswordErrorCode.PersonNotFound, 'Person not found')
		}

		await context.requireAccess({
			scope: new IdentityScope(person.identity_id),
			action: PermissionActions.PERSON_CHANGE_PASSWORD,
			message: 'You are not allowed to change password',
		})
		const result = await this.passwordChangeManager.changePassword(context.db, args.personId, args.password)

		if (!result.ok) {
			return createErrorResponse(result.error, result.errorMessage)
		}

		return { ok: true, errors: [] }
	}

	async changeMyPassword(
		parent: unknown,
		args: MutationChangeMyPasswordArgs,
		context: ResolverContext,
		info: GraphQLResolveInfo,
	): Promise<ChangeMyPasswordResponse> {
		const person = await context.db.queryHandler.fetch(PersonQuery.byIdentity(context.identity.id))
		if (!person) {
			return createErrorResponse(ChangeMyPasswordErrorCode.NotAPerson, 'Only a person can change a password')
		}
		await context.requireAccess({
			action: PermissionActions.PERSON_CHANGE_MY_PASSWORD,
			message: 'You are not allowed to change password',
		})
		const result = await this.passwordChangeManager.changeMyPassword(context.db, person, args.currentPassword, args.newPassword)

		if (!result.ok) {
			return createErrorResponse(result.error, result.errorMessage)
		}

		return { ok: true }
	}
}
