import { SignInErrorCode } from '../../schema/index.js'
import { ApiKeyManager, OtpAuthenticator } from '../service/index.js'
import { PersonQuery, PersonRow } from '../queries/index.js'
import { Providers } from '../providers.js'
import { DatabaseContext } from '../utils/index.js'
import { Response, ResponseError, ResponseOk } from '../utils/Response.js'

class SignInManager {
	constructor(
		private readonly apiKeyManager: ApiKeyManager,
		private readonly providers: Providers,
		private readonly otpAuthenticator: OtpAuthenticator,
	) {}

	async signIn(dbContext: DatabaseContext, email: string, password: string, expiration?: number, otpCode?: string): Promise<SignInResponse> {
		const personRow = await dbContext.queryHandler.fetch(PersonQuery.byEmail(email))
		if (personRow === null) {
			return new ResponseError(SignInErrorCode.UnknownEmail, `Person with email ${email} not found`)
		}
		if (!personRow.password_hash) {
			return new ResponseError(SignInErrorCode.NoPasswordSet, `No password set`)
		}
		const passwordValid = await this.providers.bcryptCompare(password, personRow.password_hash)
		if (!passwordValid) {
			return new ResponseError(SignInErrorCode.InvalidPassword, `Password does not match`)
		}
		if (personRow.otp_uri && personRow.otp_activated_at) {
			if (!otpCode) {
				return new ResponseError(SignInErrorCode.OtpRequired, `2FA is enabled. OTP token is required`)
			}
			if (!this.otpAuthenticator.validate({ uri: personRow.otp_uri }, otpCode)) {
				return new ResponseError(SignInErrorCode.InvalidOtpToken, 'OTP token validation has failed')
			}
		}

		const sessionToken = await this.apiKeyManager.createSessionApiKey(dbContext, personRow.identity_id, expiration)
		return new ResponseOk(new SignInResult(personRow, sessionToken))
	}
}

export class SignInResult {
	readonly ok = true

	constructor(public readonly person: PersonRow, public readonly token: string) {}
}

export type SignInResponse = Response<SignInResult, SignInErrorCode>

export { SignInManager }
