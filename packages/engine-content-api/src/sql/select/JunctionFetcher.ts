import Path from '../select/Path'
import Mapper from '../Mapper'
import WhereBuilder from '../select/WhereBuilder'
import { Client } from '@contember/database'
import { Input, Model, Value } from '@contember/schema'
import { ConditionBuilder } from '@contember/database'
import OrderByBuilder from './OrderByBuilder'
import ObjectNode from '../../graphQlResolver/ObjectNode'
import PredicatesInjector from '../../acl/PredicatesInjector'
import { LimitByGroupWrapper } from '@contember/database'
import { SelectBuilder } from '@contember/database'

class JunctionFetcher {
	constructor(
		private readonly db: Client,
		private readonly whereBuilder: WhereBuilder,
		private readonly orderBuilder: OrderByBuilder,
		private readonly predicateInjector: PredicatesInjector,
	) {}

	public async fetchJunction(
		relation: Model.ManyHasManyOwnerRelation,
		values: Input.PrimaryValue[],
		column: Mapper.JoiningColumns,
		targetEntity: Model.Entity,
		object: ObjectNode<Input.ListQueryInput>,
	): Promise<Record<string, Value.AtomicValue>[]> {
		const joiningTable = relation.joiningTable

		const whereColumn = column.sourceColumn.columnName
		let qb: SelectBuilder<SelectBuilder.Result, any> = this.db
			.selectBuilder()
			.from(joiningTable.tableName, 'junction_')
			.select(['junction_', joiningTable.inverseJoiningColumn.columnName])
			.select(['junction_', joiningTable.joiningColumn.columnName])
			.where(clause => clause.in(['junction_', whereColumn], values))

		const queryWithPredicates = this.predicateInjector.inject(targetEntity, object)
		const where = queryWithPredicates.args.filter
		if (where && Object.keys(where).length > 0) {
			const path = new Path([])
			qb = qb.join(targetEntity.tableName, path.getAlias(), condition =>
				condition.compareColumns(['junction_', column.targetColumn.columnName], ConditionBuilder.Operator.eq, [
					path.getAlias(),
					targetEntity.primaryColumn,
				]),
			)
			qb = this.whereBuilder.build(qb, targetEntity, path, where)
		}

		const wrapper = new LimitByGroupWrapper(
			['junction_', column.sourceColumn.columnName],
			(orderable, qb) => {
				if (object.args.orderBy) {
					;[qb, orderable] = this.orderBuilder.build(qb, orderable, targetEntity, new Path([]), object.args.orderBy)
				}
				return [orderable, qb]
			},
			object.args.offset,
			object.args.limit,
		)

		return await wrapper.getResult(qb)
	}
}

export default JunctionFetcher
