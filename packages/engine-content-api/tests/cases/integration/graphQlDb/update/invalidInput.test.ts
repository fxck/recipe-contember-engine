import { SchemaBuilder } from '@contember/schema-definition'
import { Model } from '@contember/schema'
import { test } from 'uvu'
import * as assert from 'uvu/assert'
import { executeDbTest } from '@contember/engine-api-tester'
import { GQL } from '../../../../src/tags.js'

const schema = new SchemaBuilder()
	.entity('Post', e =>
		e
			.column('slug', c => c.type(Model.ColumnType.String).unique())
			.column('createdAt', c => c.type(Model.ColumnType.DateTime)),
	)
	.buildSchema()
test('returns error for invalid date input', async () => {
	await executeDbTest({
		schema,
		seed: [
			{
				query: GQL`mutation {
							createPost(data: {slug: "foo"}) {
								ok
							}
						}`,
			},
		],
		query: GQL`mutation {
            updatePost(by: { slug: "foo" }, data: { createdAt: "2020-13-01 20:00" }) {
              ok
              errors {
              	type
	            message
              }
            }
          }`,
		return: {
			updatePost: {
				ok: false,
				errors: [{ type: 'InvalidDataInput', message: 'date/time field value out of range: "2020-13-01 20:00"' }],
			},
		},
		expectDatabase: {},
	})
})

test('returns error for invalid uuid', async () => {
	await executeDbTest({
		schema,
		seed: [],
		query: GQL`mutation {
        updatePost(by: { id: "abc" }, data: { createdAt: "2020-13-01 20:00" }) {
          ok
          errors {
            type
            message
          }
        }
      }`,
		return: response => {
			assert.ok(response.updatePost)
			assert.not.ok(response.updatePost.ok)
			assert.is(response.updatePost.errors.length, 1)
			assert.is(response.updatePost.errors[0].type, 'InvalidDataInput')
			assert.match(response.updatePost.errors[0].message, /invalid input syntax for (type )?uuid: "abc"/)
		},
		expectDatabase: {},
	})
})

test.run()
