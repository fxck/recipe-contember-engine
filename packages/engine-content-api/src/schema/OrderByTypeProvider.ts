import {
	GraphQLBoolean,
	GraphQLEnumType,
	GraphQLInputFieldConfig,
	GraphQLInputFieldConfigMap,
	GraphQLInputObjectType,
	GraphQLInputType,
	GraphQLInt,
} from 'graphql'
import { Acl, Model } from '@contember/schema'
import { acceptFieldVisitor } from '@contember/schema-utils'
import { singletonFactory } from '../utils/index.js'
import { GqlTypeName } from './utils.js'
import { Authorizator } from '../acl/index.js'
import { FieldAccessVisitor } from './FieldAccessVisitor.js'

export class OrderByTypeProvider {
	private orderBySingleton = singletonFactory(name => this.createEntityOrderByType(name))

	private orderDirectionEnum = new GraphQLEnumType({
		name: 'OrderDirection',
		values: {
			asc: { value: 'asc' },
			desc: { value: 'desc' },
		},
	})

	constructor(private readonly schema: Model.Schema, private readonly authorizator: Authorizator) {}

	public getEntityOrderByType(entityName: string): GraphQLInputType {
		return this.orderBySingleton(entityName)
	}

	private createEntityOrderByType(entityName: string): GraphQLInputType {
		return new GraphQLInputObjectType({
			name: GqlTypeName`${entityName}OrderBy`,
			fields: () => this.getEntityOrderByFields(entityName),
		})
	}

	private getEntityOrderByFields(name: string) {
		const fields: GraphQLInputFieldConfigMap = {
			_random: { type: GraphQLBoolean },
			_randomSeeded: { type: GraphQLInt },
		}
		const entity = this.schema.entities[name]

		for (const fieldName in entity.fields) {
			if (!entity.fields.hasOwnProperty(fieldName)) {
				continue
			}
			const accessVisitor = new FieldAccessVisitor(Acl.Operation.read, this.authorizator)
			if (!acceptFieldVisitor(this.schema, name, fieldName, accessVisitor)) {
				continue
			}

			const field = acceptFieldVisitor(this.schema, name, fieldName, {
				visitColumn: () => ({ type: this.orderDirectionEnum }),
				visitHasOne: (entity, relation) => ({ type: this.getEntityOrderByType(relation.target) }),
				visitHasMany: () => undefined,
			} as Model.FieldVisitor<GraphQLInputFieldConfig | undefined>)

			if (field !== undefined) {
				fields[fieldName] = field
			}
		}

		return fields
	}
}
