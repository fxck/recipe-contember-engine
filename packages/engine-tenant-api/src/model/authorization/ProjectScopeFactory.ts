import { Project, ProjectGroup, ProjectSchemaResolver } from '../type/index.js'
import { AclSchemaEvaluatorFactory } from './AclSchemaEvaluatorFactory.js'
import { AuthorizationScope } from '@contember/authorization'
import { ProjectScope } from './ProjectScope.js'
import { Identity } from './Identity.js'

export class ProjectScopeFactory {
	constructor(
		private readonly schemaResolver: ProjectSchemaResolver,
		private readonly aclSchemaEvaluatorFactory: AclSchemaEvaluatorFactory,
	) {}

	async create(projectGroup: ProjectGroup, project: Pick<Project, 'slug'>): Promise<AuthorizationScope<Identity> | null> {
		const schema = await this.schemaResolver.getSchema(projectGroup, project.slug)
		if (!schema) {
			return null
		}
		return new ProjectScope(project, schema.acl, this.aclSchemaEvaluatorFactory)
	}
}
