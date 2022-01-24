import { InputValidation, SchemaDefinition } from '@contember/schema-definition'
import { Schema } from '@contember/schema'
import * as modelDefinition from './model/index.js'
import aclFactory from './acl.js'

const model = SchemaDefinition.createModel(modelDefinition)

const schema: Schema = {
	model: model,
	acl: aclFactory(model),
	validation: InputValidation.parseDefinition(modelDefinition),
}

export default schema
