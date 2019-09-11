import { Permissions } from '@contember/authorization'
import { PermissionActions } from './PermissionActions'
import { TenantRole } from './Roles'
import { Identity } from '@contember/engine-common'

class PermissionsFactory {
	public create(): Permissions {
		const permissions = new Permissions()
		permissions.allow(Identity.SystemRole.SUPER_ADMIN, Permissions.ALL, Permissions.ALL)
		permissions.allow(TenantRole.LOGIN, ...PermissionActions.PERSON_SIGN_IN)
		permissions.allow(TenantRole.SETUP, ...PermissionActions.SYSTEM_SETUP)
		permissions.allow(TenantRole.SELF, ...PermissionActions.PERSON_CHANGE_PASSWORD)
		permissions.allow(TenantRole.PERSON, ...PermissionActions.PERSON_SIGN_OUT)
		permissions.allow(TenantRole.PROJECT_MEMBER, ...PermissionActions.PROJECT_VIEW)
		permissions.allow(TenantRole.PROJECT_ADMIN, ...PermissionActions.PROJECT_VIEW_MEMBERS)
		permissions.allow(TenantRole.PROJECT_ADMIN, ...PermissionActions.PROJECT_ADD_MEMBER)
		permissions.allow(TenantRole.PROJECT_ADMIN, ...PermissionActions.PROJECT_UPDATE_MEMBER)
		permissions.allow(TenantRole.PROJECT_ADMIN, ...PermissionActions.PROJECT_REMOVE_MEMBER)

		return permissions
	}
}

export { PermissionsFactory }
