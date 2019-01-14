import { Input, Model } from 'cms-common'
import Path from './Path'
import JoinBuilder from './JoinBuilder'
import QueryBuilder from '../../../core/knex/QueryBuilder'
import { getColumnName, getTargetEntity } from '../../../content-schema/modelUtils'
import SelectBuilder from '../../../core/knex/SelectBuilder'

class OrderByBuilder {
	constructor(private readonly schema: Model.Schema, private readonly joinBuilder: JoinBuilder) {}

	public build<Orderable extends QueryBuilder.Orderable<any>>(
		qb: SelectBuilder,
		orderable: Orderable,
		entity: Model.Entity,
		path: Path,
		orderBy: Input.OrderBy[]
	): [SelectBuilder, Orderable] {
		return orderBy.reduce<[SelectBuilder, Orderable]>(
			([qb, orderable], fieldOrderBy) => this.buildOne(qb, orderable, entity, path, fieldOrderBy),
			[qb, orderable]
		)
	}

	private buildOne<Orderable extends QueryBuilder.Orderable<any>>(
		qb: SelectBuilder,
		orderable: Orderable,
		entity: Model.Entity,
		path: Path,
		orderBy: Input.FieldOrderBy
	): [SelectBuilder, Orderable] {
		const entries = Object.entries(orderBy)
		if (entries.length !== 1) {
			throw new Error()
		}
		const [fieldName, value]: [string, Input.FieldOrderBy] = entries[0]

		if (typeof value === 'string') {
			const columnName = getColumnName(this.schema, entity, fieldName)
			const prevOrderable: any = orderable
			orderable = orderable.orderBy([path.getAlias(), columnName], value as Input.OrderDirection)
			if (qb === prevOrderable) {
				qb = (orderable as any) as SelectBuilder
			}
			return [qb, orderable]
		} else {
			const targetEntity = getTargetEntity(this.schema, entity, fieldName)
			if (!targetEntity) {
				throw new Error()
			}
			const newPath = path.for(fieldName)
			const prevQb: any = qb
			qb = this.joinBuilder.join(qb, newPath, entity, fieldName)
			if (prevQb === orderable) {
				orderable = (qb as any) as Orderable
			}
			return this.buildOne(qb, orderable, targetEntity, newPath, value)
		}
	}
}

export default OrderByBuilder
