import { Project, ProjectSchemaResolver } from '../type'
import { AclSchemaEvaluatorFactory } from './AclSchemaEvaluatorFactory'
import { AuthorizationScope } from '@contember/authorization'
import { ProjectScope } from './ProjectScope'
import { Identity } from './Identity'

export class ProjectScopeFactory {
	constructor(
		private readonly aclSchemaEvaluatorFactory: AclSchemaEvaluatorFactory,
	) {}

	async create(schemaResolver: ProjectSchemaResolver, project: Pick<Project, 'slug'>): Promise<AuthorizationScope<Identity> | null> {
		const schema = await schemaResolver.getSchema(project.slug)
		if (!schema) {
			return null
		}
		return new ProjectScope(project, schema.acl, this.aclSchemaEvaluatorFactory)
	}
}
