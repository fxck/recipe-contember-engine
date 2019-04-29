import KnexQuery from '../../../core/knex/KnexQuery'
import KnexQueryable from '../../../core/knex/KnexQueryable'
import { DiffErrorCode } from '../../schema/types'
import { QueryResult } from 'pg'

class DiffCountQuery extends KnexQuery<DiffCountQuery.Response> {
	constructor(private readonly baseEvent: string, private readonly headEvent: string) {
		super()
	}

	async fetch(queryable: KnexQueryable): Promise<DiffCountQuery.Response> {
		const diff: QueryResult = await queryable.createWrapper().raw(
			`WITH RECURSIVE events(id, previous_id, index) AS (
    SELECT id, previous_id, 0
    FROM system.event
    WHERE id = ?
    UNION ALL
    SELECT event.id, event.previous_id, index + 1
    FROM system.event, events
    WHERE event.id = events.previous_id
  )
SELECT index from events where events.id = ?
`,
			this.headEvent,
			this.baseEvent
		)

		return diff.rows.length === 0
			? new DiffCountQuery.ErrorResponse([DiffErrorCode.NOT_REBASED])
			: new DiffCountQuery.OkResponse(diff.rows[0].index)
	}
}

namespace DiffCountQuery {
	export type Response = OkResponse | ErrorResponse

	export class ErrorResponse {
		public readonly ok: false = false

		constructor(public readonly errors: DiffErrorCode[]) {}
	}

	export class OkResponse {
		public readonly ok: true = true

		constructor(public readonly diff: number) {}
	}
}

export default DiffCountQuery
