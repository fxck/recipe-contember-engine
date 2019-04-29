import { Event } from '../../dtos/Event'
import { EventType } from '../../EventType'
import DependencyBuilder from '../DependencyBuilder'

/**
 * Events in transaction are dependent on each other (meaning you have to execute whole transaction at once)
 * todo this has to be optimized that only "dangerous" operations are dependent
 *
 * v--v   v--v--v
 * A1 A2 B1 B2 B3
 *
 */
class TransactionDependencyBuilder implements DependencyBuilder {
	async build(events: Event[]): Promise<DependencyBuilder.Dependencies> {
		let trxId = null
		let eventsInTrx: Event[] = []
		let dependencies: DependencyBuilder.Dependencies = {}

		for (const event of events) {
			if (event.type === EventType.runMigration) {
				continue
			}
			if (trxId !== event.transactionId) {
				if (eventsInTrx.length > 0) {
					dependencies = { ...dependencies, ...this.buildTransactionReferences(eventsInTrx) }
				}
				trxId = event.transactionId
				eventsInTrx = []
			}

			eventsInTrx.push(event)
		}
		if (eventsInTrx.length > 0) {
			dependencies = { ...dependencies, ...this.buildTransactionReferences(eventsInTrx) }
		}

		return dependencies
	}

	private buildTransactionReferences(events: Event[]): DependencyBuilder.Dependencies {
		const ids = events.map(it => it.id)
		return ids.reduce((result, id) => ({ ...result, [id]: ids }), {})
	}
}

export default TransactionDependencyBuilder
