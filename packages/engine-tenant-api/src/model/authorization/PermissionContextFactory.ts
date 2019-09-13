import { Authorizator } from '@contember/authorization'
import { IdentityFactory } from './IdentityFactory'
import { PermissionContext } from './PermissionContext'

export class PermissionContextFactory {
	constructor(private readonly authorizator: Authorizator, private readonly identityFactory: IdentityFactory) {}

	public create(args: { id: string; roles: string[] }): PermissionContext {
		return new PermissionContext(this.identityFactory.create(args), this.authorizator)
	}
}
