import { Command, CommandConfiguration, Input, Workspace } from '@contember/cli-common'
import { updateNpmPackages } from '../../utils/npm.js'
import { updateWorkspaceApiVersion } from '../../utils/workspace.js'
import { updateMainDockerComposeConfig } from '../../utils/dockerCompose.js'

type Args = {
	version: string
}

type Options = {}

export class WorkspaceUpdateApiCommand extends Command<Args, Options> {
	protected configure(configuration: CommandConfiguration<Args, Options>): void {
		configuration.description('Updates Contember API version and all related packages')
		configuration.argument('version')
	}

	protected async execute(input: Input<Args, Options>): Promise<void> {
		const version = input.getArgument('version')
		const workspace = await Workspace.get(process.cwd())
		const upgradablePackages = ['@contember/schema', '@contember/schema-definition', '@contember/cli']

		await updateNpmPackages(upgradablePackages.map(it => ({ name: it, version })), workspace.directory)

		const prevVersion = workspace.apiVersion
		const updatedYaml = await updateWorkspaceApiVersion(workspace, version)

		if (updatedYaml) {
			console.log(`${updatedYaml} updated`)
		} else {
			console.log('contember.yaml not found, skipping')
		}

		console.log('Updating docker-compose')
		const getNewImage = (currentImage: string): string | null => {
			for (const candidate of ['contember/engine', 'contember/contember', 'contember/cli']) {
				if (prevVersion && currentImage === `${candidate}:${prevVersion}` || !prevVersion && currentImage.startsWith(`${candidate}:`)) {
					return `${candidate}:${version}`
				}
			}
			return null
		}
		await updateMainDockerComposeConfig(workspace.directory, data => ({
			...data,
			services: Object.fromEntries(Object.entries(data?.services ?? {}).map(([name, service]: [string, any]) => {
				const newImage = getNewImage(service.image)
				if (newImage) {
					console.log(`docker-compose service ${service} updated`)
					return [
						name,
						{
							...service,
							image: newImage,
						},
					]
				}
				return [name, service]
			})),
		}))
		console.log('API versions updated')
		console.log('Restart server to apply changes')
	}
}
