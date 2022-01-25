import { Connection } from './Connection.js'
import { EventManager } from './EventManager.js'
import  pg from 'pg'
import { wrapIdentifier } from '../utils/index.js'
import { executeQuery } from './execution.js'

export class Transaction implements Connection.TransactionLike {
	private _isClosed = false

	private queryContext: Connection.QueryContext = {}

	private savepointCounter = 1

	public get isClosed(): boolean {
		return this._isClosed
	}

	constructor(
		private readonly pgClient: pg.ClientBase,
		public readonly eventManager: EventManager,
		private readonly config: Connection.QueryConfig,
	) {}

	async transaction<Result>(
		callback: (connection: Connection.TransactionLike) => Promise<Result> | Result,
	): Promise<Result> {
		const savepointName = `savepoint_${this.savepointCounter++}`
		await this.query(`SAVEPOINT ${wrapIdentifier(savepointName)}`)
		const savepoint = new SavePoint(savepointName, this, this.pgClient)
		try {
			const result = await callback(savepoint)
			if (!savepoint.isClosed) {
				await savepoint.commit()
			}
			return result
		} catch (e) {
			if (!savepoint.isClosed) {
				await savepoint.rollback()
			}
			throw e
		}
	}

	async query<Row extends Record<string, any>>(
		sql: string,
		parameters: any[] = [],
		meta: Record<string, any> = {},
		config: Connection.QueryConfig = {},
	): Promise<Connection.Result<Row>> {
		if (this.isClosed) {
			throw new Error('Transaction is already closed')
		}
		return await executeQuery<Row>(
			this.pgClient,
			this.eventManager,
			{ sql, parameters, meta, ...this.config, ...config },
			this.queryContext,
		)
	}

	async rollback(): Promise<void> {
		await this.close('ROLLBACK')
	}

	async rollbackUnclosed(): Promise<void> {
		if (this.isClosed) {
			return
		}
		await this.rollback()
	}

	async commit(): Promise<void> {
		await this.close('COMMIT')
	}

	async commitUnclosed(): Promise<void> {
		if (this.isClosed) {
			return
		}
		await this.commit()
	}

	private async close(command: string) {
		await this.query(command)
		this._isClosed = true
	}
}

class SavePoint implements Connection.TransactionLike {
	private _isClosed = false

	public get isClosed(): boolean {
		return this._isClosed
	}

	public get eventManager(): EventManager {
		return this.transactionInst.eventManager
	}

	constructor(
		public readonly savepointName: string,
		private readonly transactionInst: Transaction,
		private readonly pgClient: pg.ClientBase,
	) {}

	async transaction<Result>(
		callback: (connection: Connection.TransactionLike) => Promise<Result> | Result,
	): Promise<Result> {
		return await this.transactionInst.transaction(callback)
	}

	async query<Row extends Record<string, any>>(
		sql: string,
		parameters: any[] = [],
		meta: Record<string, any> = {},
	): Promise<Connection.Result<Row>> {
		if (this.isClosed) {
			throw new Error(`Savepoint ${this.savepointName} is already closed.`)
		}
		return await this.transactionInst.query<Row>(sql, parameters, meta)
	}

	async rollback(): Promise<void> {
		await this.close(`ROLLBACK TO SAVEPOINT ${wrapIdentifier(this.savepointName)}`)
	}

	async commit(): Promise<void> {
		await this.close(`RELEASE SAVEPOINT ${wrapIdentifier(this.savepointName)}`)
	}

	private async close(sql: string) {
		await this.query(sql)
		this._isClosed = true
	}
}
