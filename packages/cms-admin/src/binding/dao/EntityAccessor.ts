import { EntityData } from './EntityData'

export class EntityAccessor {
	public constructor(
		public readonly primaryKey: string | undefined,
		public readonly data: EntityData,
		public readonly replaceWith: (replacement: EntityAccessor) => void,
		public readonly unlink?: () => void
	) {}
}
