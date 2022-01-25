import { Acl } from '@contember/schema'
import { Authorizator } from './Authorizator.js'

export class StaticAuthorizator implements Authorizator {
	constructor(private readonly permissions: Acl.Permissions) {}

	isAllowed(operation: Acl.Operation, entity: string, field?: string): boolean {
		if (!this.permissions[entity]) {
			return false
		}
		const entityPermissions: Acl.EntityPermissions = this.permissions[entity]

		if (operation === Acl.Operation.delete) {
			return !!entityPermissions.operations.delete
		}
		const fieldPermissions = entityPermissions.operations[operation]
		if (!fieldPermissions) {
			return false
		}
		if (field) {
			return !!fieldPermissions[field]
		}
		return Object.values(fieldPermissions).filter(it => !!it).length > 0
	}

	isCustomPrimaryAllowed(entity: string): boolean {
		return this.permissions?.[entity]?.operations?.customPrimary || false
	}
}
