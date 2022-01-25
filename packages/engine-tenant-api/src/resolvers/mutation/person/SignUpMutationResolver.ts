import { MutationResolvers, MutationSignUpArgs, SignUpResponse } from '../../../schema/index.js'
import { ResolverContext } from '../../ResolverContext.js'
import { PermissionActions, ApiKeyManager, SignUpManager } from '../../../model/index.js'
import { createErrorResponse } from '../../errorUtils.js'

export class SignUpMutationResolver implements MutationResolvers {
	constructor(private readonly signUpManager: SignUpManager, private readonly apiKeyManager: ApiKeyManager) {}

	async signUp(parent: any, args: MutationSignUpArgs, context: ResolverContext): Promise<SignUpResponse> {
		await context.requireAccess({
			action: PermissionActions.PERSON_SIGN_UP,
			message: 'You are not allowed to sign up',
		})

		const response = await this.signUpManager.signUp(context.db, args.email, args.password, args.roles ?? [])

		if (!response.ok) {
			return createErrorResponse(response.error, response.errorMessage)
		}
		const result = response.result
		await this.apiKeyManager.disableOneOffApiKey(context.db, context.apiKeyId)

		return {
			ok: true,
			errors: [],
			result: {
				person: {
					id: result.person.id,
					otpEnabled: !!result.person.otp_activated_at,
					email: result.person.email,
					identity: {
						id: result.person.identity_id,
						projects: [],
					},
				},
			},
		}
	}
}
