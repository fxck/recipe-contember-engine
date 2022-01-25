import { AddProjectMemberCommand, CreateProjectCommand, SetProjectSecretCommand, UpdateProjectCommand } from '../commands/index.js'
import { PermissionContext } from '../authorization/index.js'
import { Project, ProjectGroup, ProjectInitializer, ProjectWithSecrets } from '../type/index.js'
import { ProjectBySlugQuery, ProjectsByIdentityQuery, ProjectsQuery, ProjectUpdateTimestampQuery } from '../queries/index.js'
import { SecretsManager } from './SecretsManager.js'
import { DatabaseContext, TokenHash } from '../utils/index.js'
import { createSetMembershipVariables } from './membershipUtils.js'
import { ImplementationException } from '../../exceptions.js'
import { ProjectRole } from '@contember/schema'
import { ApiKeyService, CreateApiKeyResult } from './apiKey/index.js'
import { Response, ResponseError, ResponseOk } from '../utils/Response.js'
import { CreateProjectResponseErrorCode } from '../../schema/index.js'

export class ProjectManager {
	constructor(
		private readonly secretManager: SecretsManager,
		private readonly projectIntializer: ProjectInitializer,
		private readonly apiKeyService: ApiKeyService,
	) {}

	public async createProject(
		projectGroup: ProjectGroup,
		project: Pick<ProjectWithSecrets, 'name' | 'slug' | 'config' | 'secrets'>,
		ownerIdentityId: string | undefined,
		deployTokenHash?: TokenHash,
	): Promise<CreateProjectResponse> {
		return await projectGroup.database.transaction(async db => {
			const bus = db.commandBus

			const now = db.providers.now()
			const projectId = await bus.execute(new CreateProjectCommand(project, now))
			if (!projectId) {
				return new ResponseError(CreateProjectResponseErrorCode.AlreadyExists, `Project ${project.slug} already exists`)
			}
			for (const [key, value] of Object.entries(project.secrets)) {
				await bus.execute(new SetProjectSecretCommand(projectId, key, value))
			}
			if (ownerIdentityId) {
				const addMemberResult = await db.commandBus.execute(
					new AddProjectMemberCommand(projectId, ownerIdentityId, createSetMembershipVariables([{ role: ProjectRole.ADMIN, variables: [] }])),
				)
				if (!addMemberResult.ok) {
					throw new ImplementationException()
				}

			}

			const deployMembership = [{ role: ProjectRole.DEPLOYER, variables: [] }]
			const deployKeyDescription = `Deploy key for ${project.slug}`
			const deployResult = await this.apiKeyService.createProjectPermanentApiKey(db, projectId, deployMembership, deployKeyDescription, deployTokenHash)

			try {
				await this.projectIntializer.initializeProject(projectGroup, {
					id: projectId,
					...project,
					updatedAt: now,
				})
			} catch (e) {
				// eslint-disable-next-line no-console
				console.error(e)
				await db.client.connection.rollback()
				return new ResponseError(
					CreateProjectResponseErrorCode.InitError,
					`Project initialization error: ${e instanceof Error && 'message' in e ? e.message : 'unknown'}`,
				)
			}

			return new ResponseOk(new CreateProjectResult(deployResult.result))
		})
	}

	public async updateProject(dbContext: DatabaseContext, id: string, data: Partial<Pick<Project, 'name' | 'config'>>): Promise<void> {
		await dbContext.commandBus.execute(new UpdateProjectCommand(id, data))
	}

	public async getProjectBySlug(dbContext: DatabaseContext, slug: string): Promise<Project | null> {
		return await dbContext.queryHandler.fetch(new ProjectBySlugQuery(slug))
	}

	public async getProjectState(dbContext: DatabaseContext, slug: string, updatedAt: Date): Promise<'valid' | 'updated' | 'not_found'> {
		const updatedNew = await dbContext.queryHandler.fetch(new ProjectUpdateTimestampQuery(slug))
		if (!updatedNew) {
			return 'not_found'
		}
		return updatedNew > updatedAt ? 'updated' : 'valid'
	}

	public async getProjectWithSecretsBySlug(dbContext: DatabaseContext, slug: string, alias: boolean): Promise<ProjectWithSecrets | null> {
		const project = await dbContext.queryHandler.fetch(new ProjectBySlugQuery(slug, alias))
		if (!project) {
			return null
		}
		const secrets = await this.secretManager.readSecrets(dbContext, project.id)
		return { ...project, secrets }
	}

	public async getProjects(dbContext: DatabaseContext): Promise<Project[]> {
		return await dbContext.queryHandler.fetch(new ProjectsQuery())
	}

	public async getProjectsByIdentity(dbContext: DatabaseContext, identityId: string, permissionContext: PermissionContext): Promise<Project[]> {
		return await dbContext.queryHandler.fetch(new ProjectsByIdentityQuery(identityId, permissionContext))
	}
}

export class ProjectInitError extends Error {}


export type CreateProjectResponse = Response<CreateProjectResult, CreateProjectResponseErrorCode>

export class CreateProjectResult {
	constructor(public readonly deployerApiKey: CreateApiKeyResult) {
	}
}
