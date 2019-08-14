import { Client, DatabaseQueryable } from '@contember/database'
import { QueryHandler } from '@contember/queryable'
import { Identity } from '@contember/engine-common'
import {
	AddProjectMemberCommand,
	ApiKey,
	ApiKeyByTokenQuery,
	CreateIdentityCommand,
	CreateApiKeyCommand,
	DisableApiKeyCommand,
	DisableIdentityApiKeysCommand,
	DisableOneOffApiKeyCommand,
	ProlongApiKeyCommand,
	UpdateProjectMemberVariablesCommand,
} from '../'
import { AddProjectMemberErrorCode, CreateApiKeyErrorCode } from '../../schema'
import { ImplementationException } from '../../exceptions'
import { mapValues } from '../../utils/mapValue'

class ApiKeyManager {
	constructor(private readonly queryHandler: QueryHandler<DatabaseQueryable>, private readonly db: Client) {}

	async verifyAndProlong(token: string): Promise<ApiKeyManager.VerifyResult> {
		const apiKeyRow = await this.queryHandler.fetch(new ApiKeyByTokenQuery(token))
		if (apiKeyRow === null) {
			return new ApiKeyManager.VerifyResultError(ApiKeyManager.VerifyErrorCode.NOT_FOUND)
		}

		if (apiKeyRow.disabled_at !== null) {
			return new ApiKeyManager.VerifyResultError(ApiKeyManager.VerifyErrorCode.DISABLED)
		}

		const now = new Date()
		if (apiKeyRow.expires_at !== null && apiKeyRow.expires_at <= now) {
			return new ApiKeyManager.VerifyResultError(ApiKeyManager.VerifyErrorCode.EXPIRED)
		}

		setImmediate(async () => {
			await new ProlongApiKeyCommand(apiKeyRow.id, apiKeyRow.type, apiKeyRow.expiration || undefined).execute(this.db)
		})

		return new ApiKeyManager.VerifyResultOk(apiKeyRow.identity_id, apiKeyRow.id, apiKeyRow.roles)
	}

	async createSessionApiKey(identityId: string, expiration?: number): Promise<string> {
		return (await new CreateApiKeyCommand(ApiKey.Type.SESSION, identityId, expiration).execute(this.db)).token
	}

	async createLoginApiKey(): Promise<ApiKeyManager.CreateApiKeyResult> {
		const response = await this.createPermanentApiKey([Identity.SystemRole.LOGIN], [])
		if (!response.ok) {
			throw new ImplementationException(response.errors.join(', '))
		}
		return response.result
	}

	async disableOneOffApiKey(apiKeyId: string): Promise<void> {
		await new DisableOneOffApiKeyCommand(apiKeyId).execute(this.db)
	}

	async disableApiKey(apiKeyId: string): Promise<boolean> {
		return await new DisableApiKeyCommand(apiKeyId).execute(this.db)
	}

	async disableIdentityApiKeys(identityId: string): Promise<void> {
		await new DisableIdentityApiKeysCommand(identityId).execute(this.db)
	}

	async createPermanentApiKey(
		roles: string[],
		projects: { id: string; roles: string[]; variables: UpdateProjectMemberVariablesCommand.VariableUpdate[] }[],
	): Promise<ApiKeyManager.CreateApiKeyResponse> {
		return await this.db.transaction(async db => {
			const identityId = await new CreateIdentityCommand(roles).execute(db)
			const apiKeyResult = await new CreateApiKeyCommand(ApiKey.Type.PERMANENT, identityId).execute(db)

			const addMemberResponses = (await Promise.all(
				projects.map(async project => {
					return new AddProjectMemberCommand(project.id, identityId, project.roles, project.variables).execute(db)
				}),
			))
				.filter((it): it is AddProjectMemberCommand.AddProjectMemberResponseError => !it.ok)
				.map(it => it.errors)
				.map(
					mapValues<AddProjectMemberErrorCode, CreateApiKeyErrorCode>({
						[AddProjectMemberErrorCode.ProjectNotFound]: CreateApiKeyErrorCode.ProjectNotFound,
						[AddProjectMemberErrorCode.VariableNotFound]: CreateApiKeyErrorCode.VariableNotFound,
						[AddProjectMemberErrorCode.IdentityNotFound]: ImplementationException.Throw,
						[AddProjectMemberErrorCode.AlreadyMember]: ImplementationException.Throw,
					}),
				)
				.reduce((acc, val) => [...acc, ...val], [])

			if (addMemberResponses.length > 0) {
				return new ApiKeyManager.CreateApiKeyResponseError(addMemberResponses)
			}

			return new ApiKeyManager.CreateApiKeyResponseOk(new ApiKeyManager.CreateApiKeyResult(identityId, apiKeyResult))
		})
	}
}

namespace ApiKeyManager {
	export type VerifyResult = VerifyResultOk | VerifyResultError

	export class VerifyResultOk {
		readonly valid = true

		constructor(
			public readonly identityId: string,
			public readonly apiKeyId: string,
			public readonly roles: string[],
		) {}
	}

	export class VerifyResultError {
		readonly valid = false

		constructor(public readonly error: VerifyErrorCode) {}
	}

	export const enum VerifyErrorCode {
		NOT_FOUND = 'not_found',
		DISABLED = 'disabled',
		EXPIRED = 'expired',
		NO_AUTH_HEADER = 'no_auth_header',
		INVALID_AUTH_HEADER = 'invalid_auth_header',
	}

	export type CreateApiKeyResponse = CreateApiKeyResponseOk | CreateApiKeyResponseError

	export class CreateApiKeyResponseOk {
		public readonly ok = true

		constructor(public readonly result: CreateApiKeyResult) {}
	}

	export class CreateApiKeyResponseError {
		public readonly ok = false

		constructor(public readonly errors: CreateApiKeyErrorCode[]) {}
	}

	export class CreateApiKeyResult {
		constructor(public readonly identityId: string, public readonly apiKey: CreateApiKeyCommand.Result) {}
	}
}

export { ApiKeyManager }