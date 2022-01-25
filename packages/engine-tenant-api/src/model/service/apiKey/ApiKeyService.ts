import { Membership } from '../../type/Membership.js'
import { DatabaseContext, TokenHash } from '../../utils/index.js'
import { AddProjectMemberCommand, CreateApiKeyCommand, CreateIdentityCommand } from '../../commands/index.js'
import { ApiKey } from '../../type/index.js'
import { createSetMembershipVariables } from '../membershipUtils.js'
import { ImplementationException } from '../../../exceptions.js'
import { Response, ResponseOk } from '../../utils/Response.js'
import { ApiKeyWithToken } from '../../../schema/index.js'

export class ApiKeyService {
	async createPermanentApiKey(
		db: DatabaseContext,
		description: string,
		roles: readonly string[] = [],
		tokenHash?: TokenHash,
	) {
		const identityId = await db.commandBus.execute(new CreateIdentityCommand(roles, description))
		const apiKeyResult = await db.commandBus.execute(new CreateApiKeyCommand({ type: ApiKey.Type.PERMANENT, identityId, tokenHash }))

		return new ResponseOk(new CreateApiKeyResult({ id: identityId, description }, apiKeyResult))
	}

	async createProjectPermanentApiKey(
		db: DatabaseContext,
		projectId: string,
		memberships: readonly Membership[],
		description: string,
		tokenHash?: TokenHash,
	) {
		const response = await this.createPermanentApiKey(db, description, [], tokenHash)

		const addMemberResult = await db.commandBus.execute(
			new AddProjectMemberCommand(projectId, response.result.identity.id, createSetMembershipVariables(memberships)),
		)
		if (!addMemberResult.ok) {
			throw new ImplementationException()
		}
		return response
	}
}


export type CreateApiKeyResponse = Response<CreateApiKeyResult, never>

export class CreateApiKeyResult {
	constructor(public readonly identity: {id: string; description?: string}, public readonly apiKey: { id: string; token?: string }) {
	}

	toApiKeyWithToken(): ApiKeyWithToken {
		return {
			id: this.apiKey.id,
			token: this.apiKey.token,
			identity: {
				...this.identity,
				projects: [],
			},
		}
	}
}
