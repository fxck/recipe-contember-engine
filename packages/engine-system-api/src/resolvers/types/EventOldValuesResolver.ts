import { DeleteEvent, DeleteEventResolvers, UpdateEvent, UpdateEventResolvers } from '../../schema/index.js'
import { ResolverContext } from '../ResolverContext.js'
import { oldValuesLoaderFactory } from './OldValuesHelpers.js'

export class EventOldValuesResolver implements UpdateEventResolvers<ResolverContext>, DeleteEventResolvers<ResolverContext> {
	async oldValues(
		parent: UpdateEvent | DeleteEvent,
		args: unknown,
		context: ResolverContext,
	): Promise<object> {
		return await context.getLoader(oldValuesLoaderFactory)(parent.id)
	}
}
