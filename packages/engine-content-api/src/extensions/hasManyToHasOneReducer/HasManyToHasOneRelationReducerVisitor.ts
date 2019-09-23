import { GraphQLInputObjectType } from 'graphql'
import { Acl, Model } from '@contember/schema'
import EntityTypeProvider from '../../graphQLSchema/EntityTypeProvider'
import WhereTypeProvider from '../../graphQLSchema/WhereTypeProvider'
import { acceptFieldVisitor, getUniqueConstraints } from '@contember/schema-utils'
import { FieldAccessVisitor } from '../../graphQLSchema/FieldAccessVisitor'
import Authorizator from '../../acl/Authorizator'
import { aliasAwareResolver, GqlTypeName } from '../../graphQLSchema/utils'
import { Accessor } from '../../utils/accessor'
import HasManyToHasOneReducer from './HasManyToHasOneReducer'
import EntityFieldsProvider from '../EntityFieldsProvider'
import { GraphQLObjectsFactory } from '../../graphQLSchema'

class HasManyToHasOneRelationReducerFieldVisitor
	implements
		Model.ColumnVisitor<EntityFieldsProvider.FieldMap<HasManyToHasOneReducer.Meta>>,
		Model.RelationByTypeVisitor<EntityFieldsProvider.FieldMap<HasManyToHasOneReducer.Meta>> {
	constructor(
		private readonly schema: Model.Schema,
		private readonly authorizator: Authorizator,
		private readonly entityTypeProviderAccessor: Accessor<EntityTypeProvider>,
		private readonly whereTypeProvider: WhereTypeProvider,
		private readonly graphqlObjectFactories: GraphQLObjectsFactory,
	) {}

	public visitColumn() {
		return {}
	}

	public visitOneHasOneOwner() {
		return {}
	}

	public visitOneHasOneInversed() {
		return {}
	}

	public visitManyHasOne() {
		return {}
	}

	public visitManyHasManyInversed() {
		return {}
	}

	public visitManyHasManyOwner() {
		return {}
	}

	public visitOneHasMany(
		entity: Model.Entity,
		relation: Model.AnyRelation,
		targetEntity: Model.Entity,
		targetRelation: Model.AnyRelation | null,
	) {
		if (!targetRelation) {
			return {}
		}
		const uniqueConstraints = getUniqueConstraints(this.schema, targetEntity).map(unique => unique.fields)
		const composedUnique = uniqueConstraints
			.filter(fields => fields.length === 2) //todo support all uniques
			.filter(fields => fields.includes(targetRelation.name))
			.map(fields => fields.filter(it => it !== targetRelation.name))
			.map(fields => fields[0])
		const singleUnique = uniqueConstraints
			.filter(fields => fields.length === 1)
			.map(fields => fields[0])
			.filter(it => it !== targetRelation.name)

		return [...composedUnique, ...singleUnique]
			.filter(field =>
				acceptFieldVisitor(
					this.schema,
					targetEntity.name,
					field,
					new FieldAccessVisitor(Acl.Operation.read, this.authorizator),
				),
			)
			.reduce<EntityFieldsProvider.FieldMap<HasManyToHasOneReducer.Meta>>((fields, fieldName) => {
				const graphQlName = relation.name + GqlTypeName`By${fieldName}`
				const uniqueWhere: GraphQLInputObjectType = this.graphqlObjectFactories.createInputObjectType({
					//todo this can be simplified to ${targetEntity.name}By${fieldName}, but singleton must be used
					name: GqlTypeName`${entity.name}${relation.name}By${fieldName}UniqueWhere`,
					fields: () => {
						return this.whereTypeProvider.getUniqueWhereFields(targetEntity, [[fieldName]])
					},
				})

				const entityType = this.entityTypeProviderAccessor.get().getEntity(targetEntity.name)

				return {
					...fields,
					[graphQlName]: {
						type: entityType,
						meta: {
							relationName: relation.name,
						},
						args: {
							by: { type: uniqueWhere },
							filter: { type: this.whereTypeProvider.getEntityWhereType(targetEntity.name) },
						},
						resolve: aliasAwareResolver,
					},
				}
			}, {})
	}
}

export default HasManyToHasOneRelationReducerFieldVisitor
