import 'mocha'
import { expect } from 'chai'
import * as mockKnex from 'mock-knex'
import * as knex from 'knex'
import KnexWrapper from '../../../src/core/knex/KnexWrapper'
import { SQL } from '../../src/tags'
import InsertBuilder from '../../../src/core/knex/InsertBuilder'
import ConditionBuilder from "../../../src/core/knex/ConditionBuilder";

interface Test {
	query: (wrapper: KnexWrapper) => void
	sql: string
	parameters: any[]
}

const execute = async (test: Test) => {
	const connection = knex({
		// debug: true,
		client: 'pg'
	})

	mockKnex.mock(connection)
	const wrapper = new KnexWrapper(connection)

	const tracker = mockKnex.getTracker()
	tracker.install()
	let executed = false
	tracker.on('query', (query, step) => {
		expect(query.sql.replace(/\s+/g, ' ')).equals(test.sql.replace(/\s+/g, ' '))
		expect(query.bindings).deep.equals(test.parameters)
		executed = true
		query.response({rows: [], rowCount: 0})
	})
	await test.query(wrapper)
	expect(executed).equals(true)
	tracker.uninstall()
}

describe('knex query builder', () => {
	it('constructs condition', async () => {
		await execute({
			query: async wrapper => {
				const qb = wrapper.queryBuilder()
				qb.table('foo')
				qb.where(cond => {
					cond.compare('a', ConditionBuilder.Operator.eq, 1)
					cond.compare('b', ConditionBuilder.Operator.notEq, 2)
					cond.compare('c', ConditionBuilder.Operator.lt, 3)
					cond.compare('d', ConditionBuilder.Operator.lte, 4)
					cond.compare('e', ConditionBuilder.Operator.gt, 5)
					cond.compare('f', ConditionBuilder.Operator.gte, 6)

					cond.compareColumns('z', ConditionBuilder.Operator.eq, ['foo', 'x'])

					cond.in('o', [1, 2, 3])
					cond.in('m', qb => qb.select(expr => expr.selectValue(1)))

					cond.null('n')

					cond.raw('false')
				})

				await qb.getResult()
			},
			sql: SQL`select *
               from "foo"
               where "a" = $1 and "b" != $2 and "c" < $3 and "d" <= $4 and "e" > $5 and "f" >= $6 and "z" = "foo"."x" and "o" in ($7, $8, $9) and
                     "m" in (select $10) and "n" is null and false`,
			parameters: [1, 2, 3, 4, 5, 6, 1, 2, 3, 1],
		})
	})

	it('constructs "on"', async () => {
		await execute({
			query: async wrapper => {
				const qb = wrapper.queryBuilder()
				qb.select(['foo', 'id'])
				qb.table('foo')
				qb.join('bar', 'bar', clause => {
					clause.or(clause => {
						clause.compare(['bar', 'a'], ConditionBuilder.Operator.eq, 1)
						clause.compare(['bar', 'a'], ConditionBuilder.Operator.eq, 2)
						clause.not(clause => clause.compare(['bar', 'b'], ConditionBuilder.Operator.eq, 1))
					})
					clause.and(clause => {
						clause.in(['bar', 'c'], [1, 2, 3])
						clause.null(['bar', 'd'])
						clause.not(clause => clause.null(['bar', 'd']))
						clause.compareColumns(['bar', 'e'], ConditionBuilder.Operator.lte, ['bar', 'f'])
					})
				})
				await qb.getResult()
			},
			sql: SQL`select "foo"."id"
               from "foo"
                 inner join "bar" as "bar"
                   on ("bar"."a" = $1 or "bar"."a" = $2 or not("bar"."b" = $3)) and "bar"."c" in ($4, $5, $6) and "bar"."d" is null and not("bar"."d" is null)
                      and "bar"."e" <= "bar"."f"`,
			parameters: [1, 2, 1, 1, 2, 3]
		})
	})

	it('constructs insert with cte', async () => {
		await execute({
			query: async wrapper => {
				const builder = wrapper
					.insertBuilder()
					.with('root_', qb => {
						qb.select(expr => expr.selectValue('Hello', 'text'), 'title')
						qb.select(expr => expr.selectValue(1, 'int'), 'id')
						qb.select(expr => expr.selectValue(null, 'text'), 'content')
					})
					.into('author')
					.values({
						id: expr => expr.select('id'),
						title: expr => expr.select('title')
					})
					.from(qb => {
						qb.table('root_')
					})
					.returning('id')
					.onConflict(InsertBuilder.ConflictActionType.doNothing)
				await builder.execute()
			},
			sql: SQL`
				with "root_" as (select $1 :: text as "title", $2 :: int as "id", $3 :: text as "content") 
				insert into "author" ("id", "title") 
					select "id", "title" from "root_"
        on conflict do nothing returning "id"`,
			parameters: ['Hello', 1, null]
		})
	})

	it('constructs insert with on conflict update', async () => {
		await execute({
			query: async wrapper => {
				const builder = wrapper
					.insertBuilder()
					.into('author')
					.values({
						id: expr => expr.selectValue('123'),
						title: expr => expr.select('title'),
					})
					.from(qb => {
						qb.table('foo')
					})
					.returning('id')
					.onConflict(InsertBuilder.ConflictActionType.update, ['id'], {
						id: expr => expr.selectValue('123'),
						title: expr => expr.select('title'),
					})
				await builder.execute()
			},
			sql: SQL`insert into "author" ("id", "title")
        select
          $1,
          "title"
        from "foo"
      on conflict ("id") do update set id = $2, title = "title" returning "id"`,
			parameters: ['123', '123']
		})
	})

	it('constructs update with cte', async () => {
		await execute({
			query: async wrapper => {
				const qb = wrapper.queryBuilder()
				qb.with('root_', qb => {
					qb.select(expr => expr.selectValue('Hello', 'text'), 'title')
					qb.select(expr => expr.selectValue(1, 'int'), 'id')
					qb.select(expr => expr.selectValue(null, 'text'), 'content')
				})
				await qb.updateFrom(
					'author',
					{
						id: expr => expr.select(['root_', 'id']),
						title: expr => expr.select(['root_', 'title'])
					},
					qb => {
						qb.table('root_')
					}
				)
			},
			sql: SQL`with "root_" as (select
                                  $1 :: text as "title",
                                  $2 :: int as "id",
                                  $3 :: text as "content") update "author"
      set "id" = "root_"."id", "title" = "root_"."title" from "root_"`,
			parameters: ['Hello', 1, null]
		})
	})

	it('constructs select with condition', async () => {
		await execute({
			query: async wrapper => {
				const qb = wrapper.queryBuilder()
				qb.select(
					expr =>
						expr.selectCondition(condition =>
							condition.or(condition => {
								condition.compare('foo', ConditionBuilder.Operator.gte, 1)
								condition.compare('foo', ConditionBuilder.Operator.lte, 0)
							})
						),
					'bar'
				)
				await qb.getResult()
			},
			sql: SQL`select ("foo" >= $1 or "foo" <= $2) as "bar"`,
			parameters: [1, 0]
		})
	})


	it('constructs delete', async () => {
		await execute({
			query: async wrapper => {
				const qb = wrapper.deleteBuilder()
				.with('data', qb => qb.from('abc'))
				.from('bar')
				.using('data')
				.where(cond => cond.compare(['data', 'a'], ConditionBuilder.Operator.gte, 1))
				.returning('xyz')
				await qb.execute()
			},
			sql: SQL`with "data" as 
			(select * from "abc") 
			delete from "bar" 
			using "data" as "data" 
			where "data"."a" >= $1 returning "xyz"`,
			parameters: [1],
		})
	})
})
