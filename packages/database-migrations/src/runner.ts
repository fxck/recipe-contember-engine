/*
This file is based on migration runner from node-pg-migrate. (https://github.com/salsita/node-pg-migrate)

The MIT License (MIT)

Copyright (c) 2016-2020 Salsita Software &lt;jando@salsitasoft.com&gt;

Copyright (c) 2014-2016 Theo Ephraim

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
 */

import path, { join } from 'path'
import { LogFn, Logger } from 'node-pg-migrate/dist/types'
import { createSchemalize, getSchemas } from 'node-pg-migrate/dist/utils.js'
import migrateSqlFile from 'node-pg-migrate/dist/sqlMigration.js'
import { MigrationBuilder } from 'node-pg-migrate'
import { createMigrationBuilder } from './helpers.js'
import { readdir } from 'fs/promises'
import { Client, ClientBase } from 'pg'

export interface RunnerOption {
	migrationsTable: string
	migrationsSchema?: string
	schema?: string
	createSchema?: boolean
	createMigrationsSchema?: boolean
	log?: LogFn
	logger?: Logger
	verbose?: boolean
	migrationArgs?: any
	dbClient: Client
	shouldHandleConnection?: boolean
}

// Random but well-known identifier shared by all instances of node-pg-migrate
const PG_MIGRATE_LOCK_ID = 7241865325823964

const idColumn = 'id'
const nameColumn = 'name'
const runOnColumn = 'run_on'

export class Migration {
	constructor(
		public readonly name: string,
		public readonly migration: (builder: MigrationBuilder, args: any) => Promise<void> | void,

	) {}
}

export const loadMigrations = async (sqlDir: string, additional: Migration[]): Promise<Migration[]> => {
	return (
		await Promise.all(
			(
				await readdir(sqlDir)
			)
				.filter(it => path.extname(it) === '.sql')
				.map(async it => {
					const migration = (await (migrateSqlFile as any).default(join(sqlDir, it))).up
					if (!migration) {
						throw new Error()
					}
					return new Migration(path.basename(it, path.extname(it)), migration)
				}),
		)
	)
		.concat(additional)
		.sort((a, b) => a.name.localeCompare(b.name))
}

const lock = async (db: ClientBase): Promise<void> => {
	await db.query(`select pg_advisory_lock(${PG_MIGRATE_LOCK_ID})`)
}

const unlock = async (db: ClientBase): Promise<void> => {
	const { rows } = await db.query<{ lockReleased: boolean }>(`select pg_advisory_unlock(${PG_MIGRATE_LOCK_ID}) as "lockReleased"`)

	if (!rows[0].lockReleased) {
		throw new Error('Failed to release migration lock')
	}
}

const getMigrationsTableName = (options: RunnerOption): string => {
	const schema = options.migrationsSchema || options.schema || 'public'
	const { migrationsTable } = options
	return createSchemalize(
		false,
		true,
	)({
		schema,
		name: migrationsTable,
	})
}
const ensureMigrationsTable = async (db: ClientBase, options: RunnerOption): Promise<void> => {
	try {
		const fullTableName = getMigrationsTableName(options)
		await db.query(
			`CREATE TABLE IF NOT EXISTS ${fullTableName} ( ${idColumn} SERIAL PRIMARY KEY, ${nameColumn} varchar(255) NOT NULL, ${runOnColumn} timestamp NOT NULL)`,
		)
	} catch (err) {
		if (!(err instanceof Error)) {
			throw err
		}
		throw new Error(`Unable to ensure migrations table: ${err.stack}`)
	}
}

const getRunMigrations = async (db: Client, options: RunnerOption) => {
	const fullTableName = getMigrationsTableName(options)
	return (await db.query(`SELECT ${nameColumn} FROM ${fullTableName} ORDER BY ${runOnColumn}, ${idColumn}`)).rows.map(it => it[nameColumn])
}

const getMigrationsToRun = (options: RunnerOption, runNames: string[], migrations: Migration[]): Migration[] => {
	return migrations.filter(({ name }) => runNames.indexOf(name) < 0)
}

const checkOrder = (runNames: string[], migrations: Migration[]) => {
	const len = Math.min(runNames.length, migrations.length)
	for (let i = 0; i < len; i += 1) {
		const runName = runNames[i]
		const migrationName = migrations[i].name
		if (runName < migrationName) {
			throw new Error(`Previously run migration ${runName} is missing`)
		}
		if (runName !== migrationName) {
			throw new Error(`Not run migration ${migrationName} is preceding already run migration ${runName}`)
		}
	}
}

const getLogger = ({ log, logger, verbose }: RunnerOption): Logger => {
	let loggerObject: Logger = console
	if (typeof logger === 'object') {
		loggerObject = logger
	} else if (typeof log === 'function') {
		loggerObject = { debug: log, info: log, warn: log, error: log }
	}
	return verbose ? loggerObject : { ...loggerObject, debug: undefined }
}

export default async (
	getMigrations: () => Promise<Migration[]>,
	options: RunnerOption,
): Promise<{ name: string }[]> => {
	const logger = getLogger(options)
	const db = options.dbClient
	try {
		if (options.shouldHandleConnection) {
			await db.connect()
		}
		await lock(db)

		if (options.schema) {
			const schemas = getSchemas(options.schema)
			if (options.createSchema) {
				await Promise.all(schemas.map(schema => db.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`)))
			}
			await db.query(`SET search_path TO ${schemas.map(s => `"${s}"`).join(', ')}`)
		}
		if (options.migrationsSchema && options.createMigrationsSchema) {
			await db.query(`CREATE SCHEMA IF NOT EXISTS "${options.migrationsSchema}"`)
		}

		await ensureMigrationsTable(db, options)

		const runNames = await getRunMigrations(db, options)
		const migrations = await getMigrations()
		checkOrder(runNames, migrations)

		const toRun: Migration[] = getMigrationsToRun(options, runNames, migrations)

		if (!toRun.length) {
			return []
		}

		logger.info(`Migrating ${toRun.length} file(s):`)

		await db.query('BEGIN')
		try {
			for (const migration of toRun) {
				try {
					logger.info(`  Executing migration ${migration.name}...`)
					const migrationsBuilder = createMigrationBuilder()
					await migration.migration(migrationsBuilder, options.migrationArgs)
					const steps = migrationsBuilder.getSqlSteps()

					for (const sql of steps) {
						await db.query(sql)
					}

					await db.query(
						`INSERT INTO ${getMigrationsTableName(options)} (${nameColumn}, ${runOnColumn}) VALUES ('${
							migration.name
						}', NOW());`,
					)
					logger.info(`  Done`)
				} catch (e) {
					logger.warn(`  FAILED`)
					throw e
				}
			}
			await db.query('COMMIT')
		} catch (err) {
			logger.warn('Rolling back attempted migration ...')
			await db.query('ROLLBACK')
			throw err
		}

		return toRun.map(m => ({
			name: m.name,
		}))
	} finally {
		await unlock(db).catch(error => logger.warn(error.message))
		if (options.shouldHandleConnection) {
			await db.end()
		}
	}
}
