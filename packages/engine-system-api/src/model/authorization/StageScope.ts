import { AccessEvaluator, AccessNode, AuthorizationScope } from '@contember/authorization'
import { Identity } from './Identity.js'
import { SwitchEvaluatorNode } from './SwitchEvaluatorNode.js'
import { StagePermissionsFactory } from './StagePermissionsFactory.js'

export class StageScope implements AuthorizationScope<Identity> {
	constructor(private readonly stage: string, private readonly stagePermissionsFactory: StagePermissionsFactory) {}

	getIdentityAccess(identity: Identity): Promise<AccessNode> {
		const permissions = this.stagePermissionsFactory.create(this.stage)
		const roles = new AccessNode.Roles(identity.roles)
		const permissionEvaluator = new AccessEvaluator.PermissionEvaluator(permissions)
		const node = new SwitchEvaluatorNode(roles, permissionEvaluator)

		return Promise.resolve(node)
	}
}
