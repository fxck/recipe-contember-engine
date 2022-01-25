import { InputValidation as v, SchemaDefinition as d } from '@contember/schema-definition'
import { createSchema, testCreate } from '../utils.js'
import { suite } from 'uvu'

class Item {
	@v.assert(v.rules.lengthRange(5, 6), 'failure')
	value = d.stringColumn()
}

const schema = createSchema({
	Item,
})
const test = suite('Length range rule')
test('fails when value not valid #1', async () => {
	await testCreate({
		schema,
		entity: 'Item',
		data: { value: 'abcd' },
		errors: ['failure'],
	})
})
test('fails when value not valid #2', async () => {
	await testCreate({
		schema,
		entity: 'Item',
		data: { value: 'abcdefg' },
		errors: ['failure'],
	})
})

test('succeeds when value valid', async () => {
	await testCreate({
		schema,
		entity: 'Item',
		data: { value: 'abcde' },
		errors: [],
	})
})

test.run()
