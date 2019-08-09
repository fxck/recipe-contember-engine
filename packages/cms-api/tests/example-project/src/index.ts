import { Schema } from '@contember/schema'
import { InputValidation, SchemaDefinition } from '@contember/schema-definition'
import { emptySchema } from '../../../src/content-schema/schemaUtils'
import * as definitions from './model'

const model = SchemaDefinition.createModel(definitions)
const schema: Schema = {
	...emptySchema,
	validation: InputValidation.parseDefinition(definitions),
	model,
}

export default schema
