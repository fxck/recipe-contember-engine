import { AllowAllPermissionFactory, SchemaDefinition } from 'cms-api'
import { Acl, Schema } from 'cms-common'
import * as modelDefinition from './model'

const model = SchemaDefinition.createModel(modelDefinition)

const acl: Acl.Schema = {
	variables: {},
	roles: {
		admin: {
			stages: '*',
			entities: new AllowAllPermissionFactory().create(model)
		}
	}
}

const schema: Schema = {
	model: model,
	acl: acl
}

export default schema
