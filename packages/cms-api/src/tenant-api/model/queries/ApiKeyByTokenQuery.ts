import DbQuery from '../../../core/database/DbQuery'
import DbQueryable from '../../../core/database/DbQueryable'
import ApiKey from '../type/ApiKey'
import ConditionBuilder from '../../../core/database/ConditionBuilder'

class ApiKeyByTokenQuery extends DbQuery<ApiKeyByTokenQuery.Result> {
	constructor(private readonly token: string) {
		super()
	}

	async fetch(queryable: DbQueryable): Promise<ApiKeyByTokenQuery.Result> {
		const tokenHash = ApiKey.computeTokenHash(this.token)
		const rows = await queryable
			.createSelectBuilder<ApiKeyByTokenQuery.Row>()
			.select(['api_key', 'id'])
			.select(['api_key', 'type'])
			.select(['api_key', 'identity_id'])
			.select(['api_key', 'disabled_at'])
			.select(['api_key', 'expires_at'])
			.select(['identity', 'roles'])
			.select(['api_key', 'expiration'])
			.from('api_key')
			.join('identity', 'identity', joinClause =>
				joinClause.compareColumns(['api_key', 'identity_id'], ConditionBuilder.Operator.eq, ['identity', 'id'])
			)
			.where({
				token_hash: tokenHash,
			})
			.getResult()

		return this.fetchOneOrNull(rows)
	}
}

namespace ApiKeyByTokenQuery {
	export type Result = null | Row
	export type Row = {
		readonly id: string
		readonly type: ApiKey.Type
		readonly identity_id: string
		readonly disabled_at: Date | null
		readonly expires_at: Date | null
		readonly expiration: number | null
		readonly roles: string[]
	}
}

export default ApiKeyByTokenQuery
