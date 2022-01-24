import { CreateOrUpdateStageCommand } from '../commands/index.js'
import { StageBySlugQuery } from '../queries/index.js'
import { StageConfig } from '../../types.js'
import { DatabaseContext } from '../database/index.js'

class StageCreator {
	constructor() {}

	public async createStage(
		db: DatabaseContext,
		stage: StageConfig,
	): Promise<boolean> {
		const stageRow = await db.queryHandler.fetch(new StageBySlugQuery(stage.slug))
		if (stageRow && stageRow.name === stage.name) {
			return false
		}
		return await db.commandBus.execute(new CreateOrUpdateStageCommand(stage))
	}
}

export { StageCreator }
