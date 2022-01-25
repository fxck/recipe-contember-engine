import { ProjectGroup } from '../type/index.js'
import { DatabaseContextFactory } from '../utils/index.js'
import { MigrationsRunnerFactory } from '../../migrations/index.js'
import { PromiseMap } from '@contember/engine-common'

export class ProjectGroupProvider {
	private projectGroups = new PromiseMap<string | undefined, ProjectGroup>()

	constructor(
		private readonly databaseContextFactory: DatabaseContextFactory,
		private readonly migrationsRunnerFactory: MigrationsRunnerFactory,
	) {
	}

	public async getGroup(slug: string | undefined): Promise<ProjectGroup> {
		return await this.projectGroups.fetch(slug, async slug => {
			const database = this.databaseContextFactory.create(slug)
			const migrationsRunner = this.migrationsRunnerFactory.create(database.client.schema)
			// eslint-disable-next-line no-console
			await migrationsRunner.run(console.log)
			return {
				slug,
				database,
			}
		})
	}
}
