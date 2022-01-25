import { test } from 'uvu'
import { execute } from '../../../../../src/test.js'
import { SchemaBuilder } from '@contember/schema-definition'
import { Model } from '@contember/schema'
import { GQL, SQL } from '../../../../../src/tags.js'
import { testUuid } from '../../../../../src/testUuid.js'

test('Post by category name (where many has many owning)', async () => {
	await execute({
		schema: new SchemaBuilder()
			.entity('Post', entity =>
				entity.manyHasMany('categories', relation =>
					relation.target('Category', e => e.column('name', c => c.type(Model.ColumnType.String))),
				),
			)
			.buildSchema(),
		query: GQL`
        query {
          listPost(filter: {categories: {name: {eq: "Stuff"}}}) {
            id
          }
        }`,
		executes: [
			{
				sql: SQL`select "root_"."id" as "root_id"
                     from "public"."post" as "root_"
                     where "root_"."id" in (select distinct "junction_"."post_id"
                                            from "public"."post_categories" as "junction_" inner join "public"."category" as "root_" on "junction_"."category_id" = "root_"."id"
                                            where "root_"."name" = ?)`,
				parameters: ['Stuff'],
				response: {
					rows: [
						{
							root_id: testUuid(1),
						},
						{
							root_id: testUuid(3),
						},
					],
				},
			},
		],
		return: {
			data: {
				listPost: [
					{
						id: testUuid(1),
					},
					{
						id: testUuid(3),
					},
				],
			},
		},
	})
})

test('Post by category ids (where many has many owning)', async () => {
	await execute({
		schema: new SchemaBuilder()
			.entity('Post', entity =>
				entity.manyHasMany('categories', relation =>
					relation.target('Category', e => e.column('name', c => c.type(Model.ColumnType.String))),
				),
			)
			.buildSchema(),
		query: GQL`
        query {
          listPost(filter: {categories: {id: {in: ["${testUuid(10)}", "${testUuid(11)}"]}}}) {
            id
          }
        }`,
		executes: [
			{
				sql: SQL`select "root_"."id" as "root_id"
                     from "public"."post" as "root_"
                     where "root_"."id" in (select distinct "junction_"."post_id"
                                            from "public"."post_categories" as "junction_"
                                            where "junction_"."category_id" in (?, ?))`,
				parameters: [testUuid(10), testUuid(11)],
				response: {
					rows: [
						{
							root_id: testUuid(1),
						},
						{
							root_id: testUuid(3),
						},
					],
				},
			},
		],
		return: {
			data: {
				listPost: [
					{
						id: testUuid(1),
					},
					{
						id: testUuid(3),
					},
				],
			},
		},
	})
})
test.run()
