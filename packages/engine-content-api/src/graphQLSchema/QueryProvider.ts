import { GraphQLFieldConfig } from 'graphql'
import { Acl, Input, Model } from '@contember/schema'
import { getEntity } from '@contember/schema-utils'
import { Context } from '../types'
import EntityTypeProvider from './EntityTypeProvider'
import WhereTypeProvider from './WhereTypeProvider'
import Authorizator from '../acl/Authorizator'
import GraphQlQueryAstFactory from '../graphQlResolver/GraphQlQueryAstFactory'
import OrderByTypeProvider from './OrderByTypeProvider'
import { GraphQLObjectsFactory } from './GraphQLObjectsFactory'

export default class QueryProvider {
	constructor(
		private readonly schema: Model.Schema,
		private readonly authorizator: Authorizator,
		private readonly whereTypeProvider: WhereTypeProvider,
		private readonly orderByTypeProvider: OrderByTypeProvider,
		private readonly entityTypeProvider: EntityTypeProvider,
		private readonly queryAstAFactory: GraphQlQueryAstFactory,
		private readonly graphqlObjectFactories: GraphQLObjectsFactory,
	) {}

	public getQueries(entityName: string): { [fieldName: string]: GraphQLFieldConfig<any, Context, any> } {
		if (!this.authorizator.isAllowed(Acl.Operation.read, entityName)) {
			return {}
		}
		return {
			['get' + entityName]: this.getByUniqueQuery(entityName),
			['list' + entityName]: this.getListQuery(entityName),
		}
	}

	private getByUniqueQuery(entityName: string): GraphQLFieldConfig<any, Context, Input.UniqueQueryInput> {
		const entity = getEntity(this.schema, entityName)
		return {
			type: this.entityTypeProvider.getEntity(entityName),
			args: {
				by: {
					type: this.graphqlObjectFactories.createNotNull(this.whereTypeProvider.getEntityUniqueWhereType(entityName)),
				},
			},
			resolve: (parent, args, context, info) =>
				context.executionContainer.get('readResolver').resolveGetQuery(entity, this.queryAstAFactory.create(info)),
		}
	}

	private getListQuery(entityName: string): GraphQLFieldConfig<any, Context, Input.ListQueryInput> {
		const entity = getEntity(this.schema, entityName)

		return {
			type: this.graphqlObjectFactories.createList(this.entityTypeProvider.getEntity(entityName)),
			args: {
				filter: { type: this.whereTypeProvider.getEntityWhereType(entityName) },
				orderBy: {
					type: this.graphqlObjectFactories.createList(
						this.graphqlObjectFactories.createNotNull(this.orderByTypeProvider.getEntityOrderByType(entityName)),
					),
				},
				offset: { type: this.graphqlObjectFactories.int },
				limit: { type: this.graphqlObjectFactories.int },
			},
			resolve: (parent, args, context, info) =>
				context.executionContainer.get('readResolver').resolveListQuery(entity, this.queryAstAFactory.create(info)),
		}
	}
}
