import { test } from 'uvu'
import { execute, sqlTransaction } from '../../../../../src/test.js'
import { GQL, SQL } from '../../../../../src/tags.js'
import { testUuid } from '../../../../../src/testUuid.js'
import { postWithCategories } from './schema.js'

test('connect', async () => {
	await execute({
		schema: postWithCategories,
		query: GQL`mutation {
        updateCategory(
            by: {id: "${testUuid(2)}"},
            data: {posts: [{connect: {id: "${testUuid(1)}"}}]}
          ) {
          ok
        }
      }`,
		executes: [
			...sqlTransaction([
				{
					sql: SQL`select "root_"."id" from "public"."category" as "root_" where "root_"."id" = ?`,
					parameters: [testUuid(2)],
					response: { rows: [{ id: testUuid(2) }] },
				},
				{
					sql: SQL`select "root_"."id" from "public"."post" as "root_" where "root_"."id" = ?`,
					parameters: [testUuid(1)],
					response: { rows: [{ id: testUuid(1) }] },
				},
				{
					sql: SQL`insert into "public"."post_categories" ("post_id", "category_id")
							values (?, ?)
              on conflict do nothing`,
					parameters: [testUuid(1), testUuid(2)],
					response: 1,
				},
			]),
		],
		return: {
			data: {
				updateCategory: {
					ok: true,
				},
			},
		},
	})
})
test.run()
