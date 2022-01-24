import { Authorizator } from '@contember/authorization'
import { IdentityFactory } from './IdentityFactory.js'
import { PermissionContext } from './PermissionContext.js'
import { ProjectScopeFactory } from './ProjectScopeFactory.js'
import { ProjectGroup } from '../type/index.js'

export class PermissionContextFactory {
	constructor(
		private readonly authorizator: Authorizator,
		private readonly identityFactory: IdentityFactory,
		private readonly projectScopeFactory: ProjectScopeFactory,
	) {}

	public create(projectGroup: ProjectGroup, args: { id: string; roles: string[] }): PermissionContext {
		const identity = this.identityFactory.create(projectGroup.database, args)
		return new PermissionContext(identity, this.authorizator, this.projectScopeFactory, projectGroup)
	}
}
