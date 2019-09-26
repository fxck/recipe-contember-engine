import { Schema } from '@contember/schema'
import { emptyModelSchema } from './model'

export * from './model'
export * from './acl'
export * from './dataUtils'
export * from './validation'

export const emptySchema: Schema = {
	model: emptyModelSchema,
	acl: { roles: {} },
	validation: {},
}
