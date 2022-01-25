import { MigrationBuilder } from 'node-pg-migrate'
import type { ClientConfig } from 'pg'
import pg from 'pg'
import { ClientError, ClientErrorCodes, DatabaseCredentials } from '@contember/database'
import MigrationBuilderImpl from 'node-pg-migrate/dist/migration-builder.js'
import { escapeValue as pgEscape } from 'node-pg-migrate/dist/utils.js'

export function createMigrationBuilder(): MigrationBuilder & { getSql: () => string; getSqlSteps: () => string[] } {
	return new MigrationBuilderImpl(
		{
			query: null,
			select: null,
		} as any,
		{},
		false,
		{} as any,
	)
}

export function escapeValue(value: any): any {
	return pgEscape(value)
}

const wrapIdentifier = (value: string) => '"' + value.replace(/"/g, '""') + '"'

export async function createPgClient(cfg: ClientConfig): Promise<pg.Client> {
	const client = (await import('pg')).default.Client
	return new client(cfg)
}

export const createDatabaseIfNotExists = async (db: DatabaseCredentials, log: (message: string) => void) => {
	const Connection = (await import('@contember/database')).Connection
	try {
		const connection = new Connection(db, {})
		await connection.query('SELECT 1')
		await connection.end()
		return
	} catch (e) {
		if (!(e instanceof ClientError && e.code === ClientErrorCodes.INVALID_CATALOG_NAME)) {
			throw e
		}
	}

	log(`Database ${db.database} does not exist, attempting to create it...`)
	const connection = new Connection({ ...db, database: 'postgres' }, {})
	await connection.query(`CREATE DATABASE ${wrapIdentifier(db.database)}`)
	await connection.end()
}
