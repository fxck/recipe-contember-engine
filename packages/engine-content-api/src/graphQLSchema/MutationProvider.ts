import { GraphQLFieldConfig, GraphQLObjectType, GraphQLObjectTypeConfig } from 'graphql'
import { Acl, Input, Model } from '@contember/schema'
import { getEntity } from '@contember/schema-utils'
import { Context } from '../types'
import EntityTypeProvider from './EntityTypeProvider'
import WhereTypeProvider from './WhereTypeProvider'
import Authorizator from '../acl/Authorizator'
import EntityInputProvider from './mutations/EntityInputProvider'
import GraphQlQueryAstFactory from '../graphQlResolver/GraphQlQueryAstFactory'
import { filterObject } from '../utils/object'
import { aliasAwareResolver, GqlTypeName } from './utils'
import { GraphQLObjectsFactory } from './GraphQLObjectsFactory'
import { ValidationSchemaTypeProvider } from './ValidationSchemaTypeProvider'

type FieldConfig<TArgs> = GraphQLFieldConfig<Context, any, TArgs>

export default class MutationProvider {
	constructor(
		private readonly schema: Model.Schema,
		private readonly authorizator: Authorizator,
		private readonly whereTypeProvider: WhereTypeProvider,
		private readonly entityTypeProvider: EntityTypeProvider,
		private readonly createEntityInputProvider: EntityInputProvider<EntityInputProvider.Type.create>,
		private readonly updateEntityInputProvider: EntityInputProvider<EntityInputProvider.Type.update>,
		private readonly queryAstAFactory: GraphQlQueryAstFactory,
		private readonly graphqlObjectFactories: GraphQLObjectsFactory,
		private readonly validationSchemaTypeProvider: ValidationSchemaTypeProvider,
	) {}

	public getMutations(entityName: string): { [fieldName: string]: FieldConfig<any> } {
		const mutations: { [fieldName: string]: FieldConfig<any> | undefined } = {}
		mutations[`create${entityName}`] = this.getCreateMutation(entityName)
		mutations[`delete${entityName}`] = this.getDeleteMutation(entityName)
		mutations[`update${entityName}`] = this.getUpdateMutation(entityName)

		return filterObject(mutations, (key, value): value is FieldConfig<any> => value !== undefined)
	}

	private getCreateMutation(entityName: string): FieldConfig<Input.CreateInput> | undefined {
		const entity = getEntity(this.schema, entityName)
		const dataType = this.createEntityInputProvider.getInput(entityName)
		if (dataType === undefined) {
			return undefined
		}
		const resultType = this.createResultType(entityName, 'create')
		return {
			type: this.graphqlObjectFactories.createNotNull(resultType),
			args: {
				data: { type: this.graphqlObjectFactories.createNotNull(dataType) },
			},
			resolve: (parent, args, context: Context, info) =>
				context.executionContainer.get('mutationResolver').resolveCreate(
					entity,
					args,
					this.queryAstAFactory.create(info, (node, path) => {
						return path.length !== 1 || node.name.value === 'node'
					}),
				),
		}
	}

	private getDeleteMutation(entityName: string): FieldConfig<Input.DeleteInput> | undefined {
		if (!this.authorizator.isAllowed(Acl.Operation.delete, entityName)) {
			return undefined
		}
		const entity = getEntity(this.schema, entityName)
		return {
			type: this.graphqlObjectFactories.createNotNull(this.createResultType(entityName, 'delete')),
			args: {
				by: {
					type: this.graphqlObjectFactories.createNotNull(this.whereTypeProvider.getEntityUniqueWhereType(entityName)),
				},
			},
			resolve: (parent, args, context: Context, info) =>
				context.executionContainer.get('mutationResolver').resolveDelete(
					entity,
					args,
					this.queryAstAFactory.create(info, (node, path) => {
						return path.length !== 1 || node.name.value === 'node'
					}),
				),
		}
	}

	public getUpdateMutation(entityName: string): FieldConfig<Input.UpdateInput> | undefined {
		const entity = getEntity(this.schema, entityName)
		const dataType = this.updateEntityInputProvider.getInput(entityName)
		if (dataType === undefined) {
			return undefined
		}
		const resultType = this.createResultType(entityName, 'update')
		return {
			type: this.graphqlObjectFactories.createNotNull(resultType),
			args: {
				by: {
					type: this.graphqlObjectFactories.createNotNull(this.whereTypeProvider.getEntityUniqueWhereType(entityName)),
				},
				data: { type: this.graphqlObjectFactories.createNotNull(dataType) },
			},
			resolve: (parent, args, context: Context, info) =>
				context.executionContainer.get('mutationResolver').resolveUpdate(
					entity,
					args,
					this.queryAstAFactory.create(info, (node, path) => {
						return path.length !== 1 || node.name.value === 'node'
					}),
				),
		}
	}

	private createResultType(entityName: string, operation: 'create' | 'update' | 'delete'): GraphQLObjectType {
		const nodeType = this.entityTypeProvider.getEntity(entityName)
		const fields: GraphQLObjectTypeConfig<any, any>['fields'] = {
			ok: { type: this.graphqlObjectFactories.createNotNull(this.graphqlObjectFactories.boolean) },
			node: { type: nodeType, resolve: aliasAwareResolver },
		}
		if (operation !== 'delete') {
			fields.validation = {
				type: this.graphqlObjectFactories.createNotNull(this.validationSchemaTypeProvider.validationResultType),
			}
		}
		return this.graphqlObjectFactories.createObjectType({
			name: GqlTypeName`${entityName}${operation}Result`,
			fields: fields,
		})
	}
}
