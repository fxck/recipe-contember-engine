import { test } from 'uvu'
import { execute, sqlTransaction } from '../../../../../src/test.js'
import { SchemaBuilder } from '@contember/schema-definition'
import { Model } from '@contember/schema'
import { GQL, SQL } from '../../../../../src/tags.js'
import { testUuid } from '../../../../../src/testUuid.js'

test('insert category with posts (many has many, inverse)', async () => {
	await execute({
		schema: new SchemaBuilder()
			.entity('Post', e =>
				e
					.column('name', c => c.type(Model.ColumnType.String))
					.manyHasMany('categories', r => r.target('Category').inversedBy('posts')),
			)
			.entity('Category', e => e.column('name', c => c.type(Model.ColumnType.String)))
			.buildSchema(),
		query: GQL`
        mutation {
          createCategory(data: {name: "Hello world", posts: [{create: {name: "Post 1"}}, {create: {name: "Post 2"}}]}) {
		          node {
                    id
		          }
          }
        }
      `,
		executes: [
			...sqlTransaction([
				{
					sql: SQL`with "root_" as
						(select ? :: uuid as "id", ? :: text as "name")
						insert into "public"."category" ("id", "name")
						select "root_"."id", "root_"."name"
            from "root_"
						returning "id"`,
					parameters: [testUuid(1), 'Hello world'],
					response: { rows: [{ id: testUuid(1) }] },
				},
				{
					sql: SQL`with "root_" as
						(select ? :: uuid as "id", ? :: text as "name")
						insert into "public"."post" ("id", "name")
						select "root_"."id", "root_"."name"
            from "root_"
						returning "id"`,
					parameters: [testUuid(2), 'Post 1'],
					response: { rows: [{ id: testUuid(2) }] },
				},
				{
					sql: SQL`insert into "public"."post_categories" ("post_id", "category_id")
          values (?, ?)
          on conflict do nothing`,
					parameters: [testUuid(2), testUuid(1)],
					response: 1,
				},
				{
					sql: SQL`with "root_" as
						(select ? :: uuid as "id", ? :: text as "name")
						insert into "public"."post" ("id", "name")
						select "root_"."id", "root_"."name"
            from "root_"
						returning "id"`,
					parameters: [testUuid(3), 'Post 2'],
					response: { rows: [{ id: testUuid(3) }] },
				},
				{
					sql: SQL`insert into "public"."post_categories" ("post_id", "category_id")
          values (?, ?)
          on conflict do nothing`,
					parameters: [testUuid(3), testUuid(1)],
					response: 1,
				},
				{
					sql: SQL`select "root_"."id" as "root_id"
                     from "public"."category" as "root_"
                     where "root_"."id" = ?`,
					response: {
						rows: [{ root_id: testUuid(1) }],
					},
					parameters: [testUuid(1)],
				},
			]),
		],
		return: {
			data: {
				createCategory: {
					node: {
						id: testUuid(1),
					},
				},
			},
		},
	})
})
test.run()
