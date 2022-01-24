import { DatabaseContext } from './database/index.js'
import { ProjectConfig } from '../types.js'
import { TruncateEventsCommand, TruncateStagesCommand } from './commands/index.js'
import { formatSchemaName, getJunctionTables } from './helpers/index.js'
import { Schema } from '@contember/schema'
import { wrapIdentifier } from '@contember/database'

export class ProjectTruncateExecutor {
	public async truncateProject(db: DatabaseContext, project: ProjectConfig, schema: Schema) {
		await db.transaction(async trx => {
			await trx.client.query('SET CONSTRAINTS ALL DEFERRED')
			const tableNames = Object.values(schema.model.entities).map(it => it.tableName)
			const junctionTableNames = getJunctionTables(schema.model).map(it => it.tableName)
			const allTableNames = [...tableNames, ...junctionTableNames]
			for (const stage of project.stages) {
				const schemaName = formatSchemaName(stage)
				const wrappedNames = allTableNames.map(it => `${wrapIdentifier(schemaName)}.${wrapIdentifier(it)}`)
				await trx.client.query(`TRUNCATE ${wrappedNames}`)
			}
			await trx.client.query('SET CONSTRAINTS ALL IMMEDIATE')
			await trx.commandBus.execute(new TruncateStagesCommand())
			await trx.commandBus.execute(new TruncateEventsCommand())
		})
	}
}
