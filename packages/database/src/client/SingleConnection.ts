import  pg from 'pg'
import { EventManager, EventManagerImpl } from './EventManager.js'
import { Client } from './Client.js'
import { Transaction } from './Transaction.js'
import { executeQuery } from './execution.js'
import { Connection } from './Connection.js'

class SingleConnection implements Connection.ConnectionLike, Connection.ClientFactory {
	constructor(
		private readonly pgClient: pg.Client,
		private readonly queryConfig: Connection.QueryConfig,
		public readonly eventManager: EventManager = new EventManagerImpl(),
		private isConnected = false,
	) {}

	public createClient(schema: string, queryMeta: Record<string, any>): Client {
		return new Client(this, schema, queryMeta)
	}

	async transaction<Result>(
		callback: (connection: Connection.TransactionLike) => Promise<Result> | Result,
	): Promise<Result> {
		if (!this.isConnected) {
			await this.pgClient.connect()
			this.isConnected = true
		}
		const eventManager = new EventManagerImpl(this.eventManager)
		await executeQuery(this.pgClient, eventManager, {
			sql: 'BEGIN',
			...this.queryConfig,
		})
		const transaction = new Transaction(this.pgClient, eventManager, this.queryConfig)
		try {
			const result = await callback(transaction)

			await transaction.commitUnclosed()

			return result
		} catch (e) {
			await transaction.rollbackUnclosed()
			throw e
		}
	}

	async end(): Promise<void> {
		this.isConnected = false
		await this.pgClient.end()
	}

	async query<Row extends Record<string, any>>(
		sql: string,
		parameters: any[] = [],
		meta: Record<string, any> = {},
		config: Connection.QueryConfig = {},
	): Promise<Connection.Result<Row>> {
		if (!this.isConnected) {
			await this.pgClient.connect()
			this.isConnected = true
		}
		const query: Connection.Query = { sql, parameters, meta, ...this.queryConfig, ...config }
		try {
			return await executeQuery<Row>(this.pgClient, this.eventManager, query, {})
		} catch (e) {
			throw e
		}
	}
}
export { SingleConnection }
