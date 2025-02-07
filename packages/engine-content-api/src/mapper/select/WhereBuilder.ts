import { isIt } from '../../utils'
import { acceptFieldVisitor } from '@contember/schema-utils'
import { Input, Model } from '@contember/schema'
import { Path, PathFactory } from './Path'
import { JoinBuilder } from './JoinBuilder'
import { ConditionBuilder } from './ConditionBuilder'
import { ConditionBuilder as SqlConditionBuilder, Operator, QueryBuilder, SelectBuilder } from '@contember/database'
import { WhereOptimizer } from './optimizer/WhereOptimizer'

export class WhereBuilder {
	constructor(
		private readonly schema: Model.Schema,
		private readonly joinBuilder: JoinBuilder,
		private readonly conditionBuilder: ConditionBuilder,
		private readonly pathFactory: PathFactory,
		private readonly whereOptimizer: WhereOptimizer,
	) {}

	public build(
		qb: SelectBuilder<SelectBuilder.Result>,
		entity: Model.Entity,
		path: Path,
		where: Input.OptionalWhere,
		allowManyJoin: boolean = false,
	) {
		return this.buildAdvanced(entity, path, where, cb => qb.where(clause => cb(clause)), allowManyJoin)
	}

	public buildAdvanced(
		entity: Model.Entity,
		path: Path,
		where: Input.OptionalWhere,
		callback: (clauseCb: (clause: SqlConditionBuilder) => SqlConditionBuilder) => SelectBuilder<SelectBuilder.Result>,
		allowManyJoin: boolean = false,
	) {
		const optimizedWhere = this.whereOptimizer.optimize(where, entity)
		const joinList: WhereJoinDefinition[] = []

		const qbWithWhere = callback(clause => this.buildInternal(clause, entity, path, optimizedWhere, allowManyJoin, joinList))
		return joinList.reduce<SelectBuilder<SelectBuilder.Result>>(
			(qb, { path, entity, relationName }) => this.joinBuilder.join(qb, path, entity, relationName),
			qbWithWhere,
		)
	}

	private buildInternal(
		conditionBuilder: SqlConditionBuilder,
		entity: Model.Entity,
		path: Path,
		where: Input.Where,
		allowManyJoin: boolean,
		joinList: WhereJoinDefinition[],
	): SqlConditionBuilder {
		const tableName = path.alias

		if (where.and !== undefined && where.and.length > 0) {
			const expr = where.and
			conditionBuilder = conditionBuilder.and(clause =>
				expr.reduce(
					(clause2, where) =>
						!where ? clause2 : this.buildInternal(clause2, entity, path, where, allowManyJoin, joinList),
					clause,
				),
			)
		}
		if (where.or !== undefined && where.or.length > 0) {
			const expr = where.or
			conditionBuilder = conditionBuilder.or(clause =>
				expr.reduce(
					(clause2, where) =>
						!where
							? clause2
							: clause2.and(clause3 => this.buildInternal(clause3, entity, path, where, allowManyJoin, joinList)),
					clause,
				),
			)
		}
		if (where.not !== undefined) {
			const expr = where.not
			conditionBuilder = conditionBuilder.not(clause =>
				this.buildInternal(clause, entity, path, expr, allowManyJoin, joinList),
			)
		}

		for (const fieldName in where) {
			if (fieldName === 'and' || fieldName === 'or' || fieldName === 'not') {
				continue
			}

			const joinedWhere = (
				entity: Model.Entity,
				relation: Model.Relation,
				targetEntity: Model.Entity,
			): SqlConditionBuilder => {
				const targetPath = path.for(fieldName)
				const relationWhere = where[fieldName] as Input.Where
				if (Object.keys(relationWhere).length === 0) {
					return conditionBuilder
				}
				if (isIt<Model.JoiningColumnRelation>(relation, 'joiningColumn')) {
					const primaryCondition = this.transformWhereToPrimaryCondition(relationWhere, targetEntity.primary)
					if (primaryCondition !== null) {
						return this.conditionBuilder.build(
							conditionBuilder,
							tableName,
							relation.joiningColumn.columnName,
							(targetEntity.fields[targetEntity.primary] as Model.AnyColumn).columnType,
							primaryCondition,
						)
					}
				}

				joinList.push({ path: targetPath, entity, relationName: relation.name })

				return this.buildInternal(conditionBuilder, targetEntity, targetPath, relationWhere, allowManyJoin, joinList)
			}

			conditionBuilder = acceptFieldVisitor<SqlConditionBuilder>(this.schema, entity, fieldName, {
				visitColumn: (entity, column) => {
					const subWhere: Input.Condition<Input.ColumnValue> = where[column.name] as Input.Condition<Input.ColumnValue>
					return this.conditionBuilder.build(conditionBuilder, tableName, column.columnName, column.columnType, subWhere)
				},
				visitOneHasOneInverse: joinedWhere,
				visitOneHasOneOwning: joinedWhere,
				visitManyHasOne: joinedWhere,
				visitManyHasManyInverse: (entity, relation, targetEntity, targetRelation) => {
					if (allowManyJoin) {
						return joinedWhere(entity, relation, targetEntity)
					}
					const relationWhere = where[fieldName] as Input.Where

					return conditionBuilder.exists(
						this.createManyHasManySubquery(
							[tableName, entity.primaryColumn],
							relationWhere,
							targetEntity,
							targetRelation.joiningTable,
							'inverse',
						),
					)
				},
				visitManyHasManyOwning: (entity, relation, targetEntity) => {
					if (allowManyJoin) {
						return joinedWhere(entity, relation, targetEntity)
					}

					const relationWhere = where[fieldName] as Input.Where

					return conditionBuilder.exists(
						this.createManyHasManySubquery(
							[tableName, entity.primaryColumn],
							relationWhere,
							targetEntity,
							relation.joiningTable,
							'owning',
						),
					)
				},
				visitOneHasMany: (entity, relation, targetEntity, targetRelation) => {
					if (allowManyJoin) {
						return joinedWhere(entity, relation, targetEntity)
					}

					const relationWhere = where[fieldName] as Input.Where

					return conditionBuilder.exists(
						this.build(
							SelectBuilder.create()
								.select(it => it.raw('1'))
								.from(targetEntity.tableName, 'sub_')
								.where(it => it.columnsEq([tableName, entity.primaryColumn], ['sub_', targetRelation.joiningColumn.columnName])),
							targetEntity,
							this.pathFactory.create([], 'sub_'),
							relationWhere,
							true,
						),
					)
				},
			})
		}
		return conditionBuilder
	}

	private createManyHasManySubquery(
		outerColumn: QueryBuilder.ColumnIdentifier,
		relationWhere: Input.Where,
		targetEntity: Model.Entity,
		joiningTable: Model.JoiningTable,
		fromSide: 'owning' | 'inverse',
	) {
		const fromColumn = fromSide === 'owning' ? joiningTable.joiningColumn.columnName : joiningTable.inverseJoiningColumn.columnName
		const toColumn = fromSide === 'owning' ? joiningTable.inverseJoiningColumn.columnName : joiningTable.joiningColumn.columnName
		const qb = SelectBuilder.create<SelectBuilder.Result>()
			.from(joiningTable.tableName, 'junction_')
			.select(it => it.raw('1'))
			.where(it => it.columnsEq(outerColumn, ['junction_', fromColumn]))

		const primaryCondition = this.transformWhereToPrimaryCondition(relationWhere, targetEntity.primary)
		if (primaryCondition !== null) {

			const columnType = (targetEntity.fields[targetEntity.primary] as Model.AnyColumn).columnType

			return qb.where(condition =>
				this.conditionBuilder.build(condition, 'junction_', toColumn, columnType, primaryCondition),
			)
		}

		const qbJoined = qb.join(targetEntity.tableName, 'sub_', clause =>
			clause.compareColumns(['junction_', toColumn], Operator.eq, ['sub_', targetEntity.primary]),
		)
		return this.buildAdvanced(
			targetEntity,
			this.pathFactory.create([], 'sub_'),
			relationWhere,
			cb => qbJoined.where(clause => cb(clause)),
			true,
		)
	}

	private transformWhereToPrimaryCondition(where: Input.Where, primaryField: string): Input.Condition<never> | null {
		const keys = Object.keys(where)
		if (keys.filter(it => !['and', 'or', 'not', primaryField].includes(it)).length > 0) {
			return null
		}
		let condition: {
			and?: Array<Input.Condition<never>>
			or?: Array<Input.Condition<never>>
			not?: Input.Condition<never>
		} = {}
		if (where.and) {
			const conditions = where.and
				.filter((it): it is Input.Where => !!it)
				.map(it => this.transformWhereToPrimaryCondition(it, primaryField))
			if (conditions.includes(null)) {
				return null
			}
			condition.and = conditions as Input.Condition<never>[]
		}
		if (where.or) {
			const conditions = where.or
				.filter((it): it is Input.Where => !!it)
				.map(it => this.transformWhereToPrimaryCondition(it, primaryField))
			if (conditions.includes(null)) {
				return null
			}
			condition.or = conditions as Input.Condition<never>[]
		}
		if (where.not) {
			const conditions = this.transformWhereToPrimaryCondition(where.not, primaryField)
			if (conditions === null) {
				return null
			}
			condition.not = conditions as Input.Condition<never>
		}
		if (where[primaryField]) {
			if (Object.keys(condition).length > 0) {
				return { and: [condition, where[primaryField] as Input.Condition<never>] }
			}
			return where[primaryField] as Input.Condition<never>
		}
		return condition
	}
}

export type WhereJoinDefinition = { path: Path; entity: Model.Entity; relationName: string }
