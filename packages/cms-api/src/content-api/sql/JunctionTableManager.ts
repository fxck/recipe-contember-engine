import { getEntity } from '../../content-schema/modelUtils'
import Path from './select/Path'
import Mapper from './Mapper'
import UniqueWhereExpander from '../graphQlResolver/UniqueWhereExpander'
import WhereBuilder from './select/WhereBuilder'
import PredicateFactory from '../../acl/PredicateFactory'
import KnexWrapper from '../../core/knex/KnexWrapper'
import { Acl, Input, Model } from 'cms-common'
import InsertBuilder from '../../core/knex/InsertBuilder'
import QueryBuilder from '../../core/knex/QueryBuilder'
import ConditionBuilder from '../../core/knex/ConditionBuilder'

class JunctionTableManager {
	constructor(
		private readonly schema: Model.Schema,
		private readonly predicateFactory: PredicateFactory,
		private readonly uniqueWhereExpander: UniqueWhereExpander,
		private readonly whereBuilder: WhereBuilder,
		private readonly connectJunctionHandler: JunctionTableManager.JunctionConnectHandler,
		private readonly disconnectJunctionHandler: JunctionTableManager.JunctionDisconnectHandler
	) {}

	public async connectJunction(
		owningEntity: Model.Entity,
		relation: Model.ManyHasManyOwnerRelation,
		ownerUnique: Input.UniqueWhere,
		inversedUnique: Input.UniqueWhere
	): Promise<void> {
		await this.executeJunctionModification(
			owningEntity,
			relation,
			ownerUnique,
			inversedUnique,
			this.connectJunctionHandler
		)
	}

	public async disconnectJunction(
		owningEntity: Model.Entity,
		relation: Model.ManyHasManyOwnerRelation,
		ownerUnique: Input.UniqueWhere,
		inversedUnique: Input.UniqueWhere
	): Promise<void> {
		await this.executeJunctionModification(
			owningEntity,
			relation,
			ownerUnique,
			inversedUnique,
			this.disconnectJunctionHandler
		)
	}

	private async executeJunctionModification(
		owningEntity: Model.Entity,
		relation: Model.ManyHasManyOwnerRelation,
		ownerUnique: Input.UniqueWhere,
		inversedUnique: Input.UniqueWhere,
		handler: JunctionTableManager.JunctionHandler
	): Promise<void> {
		const joiningTable = relation.joiningTable
		const inversedEntity = getEntity(this.schema, relation.target)

		const owningPredicate = this.predicateFactory.create(owningEntity, Acl.Operation.update, [relation.name])
		let inversePredicate: Input.Where = {}
		if (relation.inversedBy) {
			inversePredicate = this.predicateFactory.create(inversedEntity, Acl.Operation.update, [relation.inversedBy])
		}

		const hasNoPredicates = Object.keys(owningPredicate).length === 0 && Object.keys(inversePredicate).length === 0
		const hasPrimaryValues = ownerUnique[owningEntity.primary] && inversedUnique[inversedEntity.primary]

		if (hasNoPredicates && hasPrimaryValues) {
			const ownerPrimary = ownerUnique[owningEntity.primary] as Input.PrimaryValue
			const inversedPrimary = inversedUnique[inversedEntity.primary] as Input.PrimaryValue
			await handler.executeSimple(joiningTable, ownerPrimary, inversedPrimary)
		} else {
			const ownerWhere: Input.Where = {
				and: [owningPredicate, this.uniqueWhereExpander.expand(owningEntity, ownerUnique)],
			}

			const inversedWhere: Input.Where = {
				and: [inversePredicate, this.uniqueWhereExpander.expand(inversedEntity, inversedUnique)],
			}

			const dataCallback: QueryBuilder.Callback = qb => {
				qb.select(expr => expr.select(['owning', owningEntity.primaryColumn]), joiningTable.joiningColumn.columnName)
				qb.select(
					expr => expr.select(['inversed', inversedEntity.primaryColumn]),
					joiningTable.inverseJoiningColumn.columnName
				)
				qb.select(expr => expr.raw('true'), 'selected')

				qb.from(qb.raw('(values (null))'), 't')

				qb.join(owningEntity.tableName, 'owning', condition => condition.raw('true'))
				this.whereBuilder.build(qb, owningEntity, new Path([], 'owning'), ownerWhere)

				qb.join(inversedEntity.tableName, 'inversed', condition => condition.raw('true'))
				this.whereBuilder.build(qb, inversedEntity, new Path([], 'inversed'), inversedWhere)
			}

			await handler.executeComplex(joiningTable, dataCallback)
		}
	}
}

namespace JunctionTableManager {
	export interface JunctionHandler {
		executeSimple(
			joiningTable: Model.JoiningTable,
			ownerPrimary: Input.PrimaryValue,
			inversedPrimary: Input.PrimaryValue
		): Promise<void>

		executeComplex(joiningTable: Model.JoiningTable, dataCallback: QueryBuilder.Callback): Promise<void>
	}

	export class JunctionConnectHandler implements JunctionHandler {
		constructor(private readonly db: KnexWrapper) {}

		async executeSimple(
			joiningTable: Model.JoiningTable,
			ownerPrimary: Input.PrimaryValue,
			inversedPrimary: Input.PrimaryValue
		): Promise<void> {
			await this.db
				.insertBuilder()
				.into(joiningTable.tableName)
				.values({
					[joiningTable.joiningColumn.columnName]: expr => expr.selectValue(ownerPrimary),
					[joiningTable.inverseJoiningColumn.columnName]: expr => expr.selectValue(inversedPrimary),
				})
				.onConflict(InsertBuilder.ConflictActionType.doNothing)
				.execute()
		}

		async executeComplex(joiningTable: Model.JoiningTable, dataCallback: QueryBuilder.Callback): Promise<void> {
			const qb = this.db.queryBuilder()
			qb.with('data', dataCallback)

			const insert = this.db
				.insertBuilder()
				.into(joiningTable.tableName)
				.values({
					[joiningTable.joiningColumn.columnName]: expr => expr.select(['data', joiningTable.joiningColumn.columnName]),
					[joiningTable.inverseJoiningColumn.columnName]: expr =>
						expr.select(['data', joiningTable.inverseJoiningColumn.columnName]),
				})
				.returning(this.db.raw('true as inserted'))
				.from(qb => qb.from('data'))
				.onConflict(InsertBuilder.ConflictActionType.doNothing)

			qb.with('insert', insert.createQuery())
			qb.from(qb.raw('(values (null))'), 't')
			qb.leftJoin('data', 'data', condition => condition.raw('true'))
			qb.leftJoin('insert', 'insert', condition => condition.raw('true'))
			qb.select(expr => expr.raw('coalesce(data.selected, false)'), 'selected')
			qb.select(expr => expr.raw('coalesce(insert.inserted, false)'), 'inserted')

			const result = await qb.getResult()
			if (result[0]['selected'] === false) {
				throw new Mapper.NoResultError()
			}
		}
	}

	export class JunctionDisconnectHandler implements JunctionHandler {
		constructor(private readonly db: KnexWrapper) {}

		public async executeSimple(
			joiningTable: Model.JoiningTable,
			ownerPrimary: Input.PrimaryValue,
			inversedPrimary: Input.PrimaryValue
		): Promise<void> {
			const qb = this.db.queryBuilder()
			qb.table(joiningTable.tableName)
			qb.where(cond => cond.compare(joiningTable.joiningColumn.columnName, ConditionBuilder.Operator.eq, ownerPrimary))
			qb.where(cond =>
				cond.compare(joiningTable.inverseJoiningColumn.columnName, ConditionBuilder.Operator.eq, inversedPrimary)
			)

			await qb.delete()
		}

		public async executeComplex(joiningTable: Model.JoiningTable, dataCallback: QueryBuilder.Callback): Promise<void> {
			const qb = this.db.queryBuilder()

			const deleteQb = this.db
				.deleteBuilder()
				.from(joiningTable.tableName)
				.using('data')
				.where(cond => {
					cond.compareColumns(
						[joiningTable.tableName, joiningTable.joiningColumn.columnName],
						ConditionBuilder.Operator.eq,
						['data', joiningTable.joiningColumn.columnName]
					)
					cond.compareColumns(
						[joiningTable.tableName, joiningTable.inverseJoiningColumn.columnName],
						ConditionBuilder.Operator.eq,
						['data', joiningTable.inverseJoiningColumn.columnName]
					)
				})
				.returning(this.db.raw('true as deleted'))

			qb.with('data', dataCallback)
			qb.with('delete', deleteQb.createQuery())
			qb.from(qb.raw('(values (null))'), 't')
			qb.leftJoin('data', 'data', condition => condition.raw('true'))
			qb.leftJoin('delete', 'delete', condition => condition.raw('true'))
			qb.select(expr => expr.raw('coalesce(data.selected, false)'), 'selected')
			qb.select(expr => expr.raw('coalesce(delete.deleted, false)'), 'deleted')

			const result = await qb.getResult()
			if (result[0]['selected'] === false) {
				throw new Mapper.NoResultError()
			}
		}
	}
}

export default JunctionTableManager
