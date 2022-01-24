import { Schema } from '@contember/schema'
import { emptyModelSchema } from './model/index.js'

export * from './model/index.js'
export * from './acl/index.js'
export * from './dataUtils.js'
export * from './validation/index.js'
export * from './schemaNormalizer.js'
export * from './schemaFilter.js'
export { deepCompare } from './utils/index.js'

export const emptySchema: Schema = {
	model: emptyModelSchema,
	acl: { roles: {} },
	validation: {},
}
