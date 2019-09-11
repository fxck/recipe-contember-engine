import { AuthorizationScope, AccessNode } from '@contember/authorization'
import { Identity } from '@contember/engine-common'
import { TenantRole } from './Roles'

class IdentityScope implements AuthorizationScope<Identity> {
	constructor(private readonly identityId: string) {}

	async getIdentityAccess(identity: Identity): Promise<AccessNode> {
		return new AccessNode.Roles(identity.id === this.identityId ? [TenantRole.SELF] : [])
	}
}

export { IdentityScope }
