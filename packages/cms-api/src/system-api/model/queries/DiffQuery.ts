import KnexQuery from '../../../core/knex/KnexQuery'
import KnexQueryable from '../../../core/knex/KnexQueryable'
import { QueryResult } from 'pg'
import { EventType } from '../EventType'
import { CreateEvent, DeleteEvent, AnyEvent, RunMigrationEvent, UpdateEvent } from '../dtos/Event'
import { assertNever } from 'cms-common'

class DiffQuery extends KnexQuery<AnyEvent[]> {
	constructor(private readonly baseEvent: string, private readonly headEvent: string) {
		super()
	}

	async fetch(queryable: KnexQueryable): Promise<AnyEvent[]> {
		const diff: QueryResult = await queryable.createWrapper().raw(
			`WITH RECURSIVE events(id, type, data, previous_id, created_at, identity_id, transaction_id, index) AS (
    SELECT event.id, event.type, event.data, event.previous_id, event.created_at, event.identity_id, event.transaction_id, 0
    FROM system.event
    WHERE id = ?
    UNION ALL
    SELECT event.id, event.type, event.data, event.previous_id, event.created_at, event.identity_id, event.transaction_id, index + 1
    FROM system.event, events
    WHERE event.id = events.previous_id AND events.id <> ?
  )
SELECT * FROM events ORDER BY index DESC
`,
			this.headEvent,
			this.baseEvent
		)

		const rows: {
			id: string
			type: EventType
			data: any
			previous_id: string
			created_at: Date
			identity_id: string
			transaction_id: string
			index: number
		}[] = diff.rows

		if (rows.length < 2 || rows[0].id !== this.baseEvent || rows[rows.length - 1].id !== this.headEvent) {
			throw new Error('Cannot calculate diff.')
		}

		const result: AnyEvent[] = []
		for (let event of rows.slice(1)) {
			const data = event.data
			switch (event.type) {
				case EventType.create:
					result.push(
						new CreateEvent(
							event.id,
							event.created_at,
							event.identity_id,
							event.transaction_id,
							data.rowId,
							data.tableName,
							data.values
						)
					)
					break
				case EventType.update:
					result.push(
						new UpdateEvent(
							event.id,
							event.created_at,
							event.identity_id,
							event.transaction_id,
							data.rowId,
							data.tableName,
							data.values
						)
					)
					break
				case EventType.delete:
					result.push(
						new DeleteEvent(
							event.id,
							event.created_at,
							event.identity_id,
							event.transaction_id,
							data.rowId,
							data.tableName
						)
					)
					break
				case EventType.runMigration:
					result.push(
						new RunMigrationEvent(event.id, event.created_at, event.identity_id, event.transaction_id, data.version)
					)
					break

				case EventType.init:
					throw new Error('init migration should not be in a diff result')
				default:
					assertNever(event.type)
			}
		}

		return result
	}
}

export default DiffQuery
