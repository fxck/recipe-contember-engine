import { AnyEvent, EventType } from '@contember/engine-common'
import { CreateEvent, DeleteEvent, EventType as ApiEventType, UpdateEvent } from '../../schema/index.js'
import { assertNever } from '../../utils/index.js'
import { IdentityFetcher } from '../dependencies/index.js'
import { formatIdentity } from './identityUtils.js'
import { appendCreateSpecificData, appendDeleteSpecificData, appendUpdateSpecificData } from './EventResponseHelper.js'
import { Client } from '@contember/database'

export class EventResponseBuilder {
	constructor(private readonly identityFetcher: IdentityFetcher) {}

	public async buildResponse(tenantDb: Client, events: AnyEvent[]): Promise<(CreateEvent | DeleteEvent | UpdateEvent)[]> {
		const apiEventTypeMapping = {
			[EventType.create]: ApiEventType.Create,
			[EventType.update]: ApiEventType.Update,
			[EventType.delete]: ApiEventType.Delete,
		}
		const identityIds = events.map(it => it.identityId).filter((it, index, ids) => ids.indexOf(it) === index)
		const identities = await this.identityFetcher.fetchIdentities(tenantDb, identityIds)
		const identitiesMap = Object.fromEntries(identities.map(it => [it.identityId, it]))

		return events.map(it => {
			const commonData = {
				createdAt: it.createdAt,
				appliedAt: it.appliedAt,
				id: it.id,
				type: apiEventTypeMapping[it.type],
				description: this.formatDescription(it),
				transactionId: it.transactionId,
				identityId: it.identityId,
				identityDescription: formatIdentity(identitiesMap[it.identityId]),
			}
			switch (it.type) {
				case EventType.create:
					return ((): CreateEvent => appendCreateSpecificData(commonData, it))()
				case EventType.update:
					return ((): UpdateEvent => appendUpdateSpecificData(commonData, it))()
				case EventType.delete:
					return ((): DeleteEvent => appendDeleteSpecificData(commonData, it))()
			}
			assertNever(it)
		})
	}

	private formatDescription(event: AnyEvent): string {
		switch (event.type) {
			case EventType.create:
				return `Creating ${event.tableName}#${event.rowId.join(';')}`
			case EventType.update:
				return `Updating ${event.tableName}#${event.rowId.join(';')}`
			case EventType.delete:
				return `Deleting ${event.tableName}#${event.rowId.join(';')}`
			default:
				return assertNever(event)
		}
	}
}
