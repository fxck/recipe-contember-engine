import { ProjectConfig } from '../../types'
import LatestMigrationByStageQuery from '../queries/LatestMigrationByStageQuery'
import { MigrationsResolver, Migration } from '@contember/schema-migrations'
import { QueryHandler } from '@contember/queryable'
import { DatabaseQueryable } from '@contember/database'

class ProjectMigrationInfoResolver {
	constructor(
		private readonly project: ProjectConfig,
		private readonly migrationsResolver: MigrationsResolver,
		private readonly queryHandler: QueryHandler<DatabaseQueryable>,
	) {}

	public async getMigrationsInfo(): Promise<ProjectMigrationInfoResolver.Result> {
		const stages = this.project.stages
		const versions = (await Promise.all(
			stages.map(stage => this.queryHandler.fetch(new LatestMigrationByStageQuery(stage.slug))),
		)).map(it => (it ? it.data.version : null))
		if (stages.length > 1 && versions.filter(it => it === versions[0]).length !== versions.length) {
			throw new Error(
				'Stages in different versions found: \n' +
					stages.map((stage, i) => `\t${stage.slug}: ${versions[i]}`).join('\n'),
			)
		}

		const currentVersion = versions[0]

		// todo check previously executed migrations

		const migrationsToExecute = (await this.migrationsResolver.getMigrations()).filter(
			({ version }) => currentVersion === null || version > currentVersion,
		)

		return { currentVersion, migrationsToExecute }
	}
}

namespace ProjectMigrationInfoResolver {
	export interface Result {
		currentVersion: string | null
		migrationsToExecute: Migration[]
	}
}

export default ProjectMigrationInfoResolver
