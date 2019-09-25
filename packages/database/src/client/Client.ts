import { DeleteBuilder, InsertBuilder, SelectBuilder, UpdateBuilder } from '../builders'
import { DatabaseQueryable } from '../queryable'
import { Connection } from './Connection'
import { EventManager } from './EventManager'
import { QueryHandler } from '@contember/queryable'
import { Interface } from '@contember/utils'

class Client<ConnectionType extends Connection.ConnectionLike = Connection.ConnectionLike>
	implements Connection.Queryable {
	constructor(public readonly connection: ConnectionType, public readonly schema: string) {}

	get eventManager(): Interface<EventManager> {
		return this.connection.eventManager
	}

	public forSchema(schema: string): Client<ConnectionType> {
		return new Client<ConnectionType>(this.connection, schema)
	}

	async transaction<T>(transactionScope: (wrapper: Client<Connection.TransactionLike>) => Promise<T> | T): Promise<T> {
		return await this.connection.transaction(connection =>
			transactionScope(new Client<Connection.TransactionLike>(connection, this.schema)),
		)
	}

	selectBuilder<Result = SelectBuilder.Result>(): SelectBuilder<Result, never> {
		return SelectBuilder.create<Result>(this)
	}

	insertBuilder(): InsertBuilder.NewInsertBuilder {
		return InsertBuilder.create(this)
	}

	updateBuilder(): UpdateBuilder.NewUpdateBuilder {
		return UpdateBuilder.create(this)
	}

	deleteBuilder(): DeleteBuilder.NewDeleteBuilder {
		return DeleteBuilder.create(this)
	}

	async query<Row extends Record<string, any>>(
		sql: string,
		parameters: any[] = [],
		meta: Record<string, any> = {},
		config: Connection.QueryConfig = {},
	): Promise<Connection.Result<Row>> {
		return this.connection.query<Row>(sql, parameters, meta, config)
	}

	createQueryHandler(): QueryHandler<DatabaseQueryable> {
		const handler = new QueryHandler(
			new DatabaseQueryable(this, {
				get(): QueryHandler<DatabaseQueryable> {
					return handler
				},
			}),
		)
		return handler
	}
}

export { Client }
