import { ConflictActionType, InsertBuilder, wrapIdentifier } from '@contember/database'
import { formatSchemaName } from '../../helpers/index.js'
import { StageConfig } from '../../../types.js'
import { Command } from '../Command.js'

export class CreateOrUpdateStageCommand implements Command<boolean> {
	constructor(private readonly stage: StageConfig) {}

	public async execute({ db, providers }: Command.Args): Promise<boolean> {
		const result = await InsertBuilder.create()
			.into('stage')
			.values({
				id: providers.uuid(),
				name: this.stage.name,
				slug: this.stage.slug,
			})
			.onConflict(ConflictActionType.update, ['slug'], {
				name: this.stage.name,
			})
			.execute(db)

		await db.query('CREATE SCHEMA IF NOT EXISTS ' + wrapIdentifier(formatSchemaName(this.stage)))

		return result > 0
	}
}
