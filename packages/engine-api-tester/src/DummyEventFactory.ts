import { unnamedIdentity } from '@contember/engine-system-api'
import { CreateEvent, DeleteEvent, RunMigrationEvent, UpdateEvent } from '@contember/engine-common'
import { testUuid } from './testUuid'

export const createCreateEvent = (rowId: string, tableName: string, values: { [column: string]: any }) =>
	new CreateEvent(testUuid(1), new Date(), unnamedIdentity, testUuid(2), rowId, tableName, values)

export const createUpdateEvent = (rowId: string, tableName: string, values: { [column: string]: any }) =>
	new UpdateEvent(testUuid(1), new Date(), unnamedIdentity, testUuid(2), rowId, tableName, values)

export const createDeleteEvent = (rowId: string, tableName: string) =>
	new DeleteEvent(testUuid(1), new Date(), unnamedIdentity, testUuid(2), rowId, tableName)

export const createRunMigrationEvent = (version: string) =>
	new RunMigrationEvent(testUuid(1), new Date(), unnamedIdentity, testUuid(2), version)
