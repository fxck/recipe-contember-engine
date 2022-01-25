import { Command, CommandConfiguration, Input, pathExists, Workspace } from '@contember/cli-common'
import {
	configureExecuteMigrationCommand,
	ExecuteMigrationOptions,
	executeMigrations,
	resolveMigrationStatus,
} from '../migrations/MigrationExecuteHelper.js'
import { interactiveResolveApiToken, TenantClient } from '../../utils/tenant.js'
import { interactiveResolveInstanceEnvironmentFromInput } from '../../utils/instance/index.js'
import { SystemClient } from '../../utils/system/index.js'
import { MigrationsContainerFactory } from '../../MigrationsContainer.js'
import { AdminClient, readAdminFiles } from '../../utils/admin.js'

type Args = {
	project: string
}

type Options = ExecuteMigrationOptions & {
	admin?: string
}

export class DeployCommand extends Command<Args, Options> {
	protected configure(configuration: CommandConfiguration<Args, Options>): void {
		configuration.description('Deploy Contember project')
		configuration.argument('project')
		configuration.option('admin').valueRequired()
		configureExecuteMigrationCommand(configuration)
	}

	protected async execute(input: Input<Args, Options>): Promise<void | number> {
		const projectName = input.getArgument('project')
		const adminEndpoint = input.getOption('admin')

		const workspace = await Workspace.get(process.cwd())
		const project = await workspace.projects.getProject(projectName, { fuzzy: true })
		const projectAdminDistDir = `${project.adminDir}/dist`
		const migrationsDir = project.migrationsDir
		const container = new MigrationsContainerFactory(migrationsDir).create()

		const instance = await interactiveResolveInstanceEnvironmentFromInput(workspace, input?.getOption('instance'))
		const apiToken = await interactiveResolveApiToken({ instance })
		const remoteProject = input.getOption('remote-project') || project.name
		const tenantClient = TenantClient.create(instance.baseUrl, apiToken)
		await tenantClient.createProject(remoteProject, true)
		const systemClient = SystemClient.create(instance.baseUrl, remoteProject, apiToken)

		if (adminEndpoint && !(await pathExists(`${projectAdminDistDir}/index.html`))) {
			throw `Missing ${projectAdminDistDir}/index.html. Please build admin before deploying.`
		}

		const status = await resolveMigrationStatus(systemClient, container.migrationsResolver, false)

		const migrationExitCode = await executeMigrations({
			migrationDescriber: container.migrationDescriber,
			schemaVersionBuilder: container.schemaVersionBuilder,
			client: systemClient,
			migrations: status.migrationsToExecute,
			requireConfirmation: !input.getOption('yes'),
			force: false,
		})

		if (migrationExitCode !== 0) {
			return migrationExitCode
		}

		if (adminEndpoint) {
			const client = AdminClient.create(adminEndpoint, apiToken)
			await client.deploy(remoteProject, await readAdminFiles(projectAdminDistDir))
		}

		return 0
	}
}
