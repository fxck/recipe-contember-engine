import { test } from 'uvu'
import { execute } from '../../../../../src/test.js'
import { SchemaBuilder } from '@contember/schema-definition'
import { Model } from '@contember/schema'
import { GQL, SQL } from '../../../../../src/tags.js'
import { testUuid } from '../../../../../src/testUuid.js'

test('paginate posts with field aliases', async () => {
	await execute({
		schema: new SchemaBuilder()
			.entity('Post', entity =>
				entity
					.column('title', column => column.type(Model.ColumnType.String))
					.manyHasOne('author', relation => relation.target('Author')),
			)
			.entity('Author', entity => entity.column('name', column => column.type(Model.ColumnType.String)))
			.buildSchema(),
		query: GQL`
        query {
          paginatePost(skip: 1, first: 2, filter: {author: {name: {eq: "jack"}}}) {
	          paginator: pageInfo {
		          count: totalCount
	          }
	          posts: edges {
		          value: node {
			          id
			          title
			          author {
				          name
			          }
		          }
	          }
          }
        }`,
		executes: [
			{
				sql: SQL`select count(*) as "row_count"
from "public"."post" as "root_"
    left join "public"."author" as "root_author" on "root_"."author_id" = "root_author"."id"
where "root_author"."name" = ?`,
				parameters: ['jack'],
				response: { rows: [{ row_count: 10 }] },
			},
			{
				sql: SQL`select "root_"."id" as "root_id", "root_"."title" as "root_title", "root_"."author_id" as "root_author"
from "public"."post" as "root_"
    left join "public"."author" as "root_author" on "root_"."author_id" = "root_author"."id"
where "root_author"."name" = ? order by "root_"."id" asc limit 2 offset 1`,
				response: {
					rows: [
						{
							root_id: testUuid(1),
							root_title: 'Foo',
							root_author: testUuid(2),
						},
						{
							root_id: testUuid(3),
							root_title: 'Bar',
							root_author: testUuid(2),
						},
					],
				},
			},
			{
				sql: SQL`
              select
                "root_"."id" as "root_id",
                "root_"."name" as "root_name",
                "root_"."id" as "root_id"
              from "public"."author" as "root_"
              where "root_"."id" in (?)
						`,
				parameters: [testUuid(2)],
				response: {
					rows: [
						{
							root_id: testUuid(2),
							root_name: 'jack',
						},
					],
				},
			},
		],
		return: {
			data: {
				paginatePost: {
					paginator: {
						count: 10,
					},
					posts: [
						{
							value: {
								id: testUuid(1),
								title: 'Foo',
								author: {
									name: 'jack',
								},
							},
						},
						{
							value: {
								id: testUuid(3),
								title: 'Bar',
								author: {
									name: 'jack',
								},
							},
						},
					],
				},
			},
		},
	})
})
test.run()
