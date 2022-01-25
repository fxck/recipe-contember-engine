import { suite } from 'uvu'
import { InputValidation as v, SchemaDefinition as d } from '@contember/schema-definition'
import { createSchema, testCreate } from '../utils.js'

const test = suite('Max length rule')

class Item {
	@v.assert(v.rules.maxLength(5), 'failure')
	value = d.stringColumn()
}

const schema = createSchema({
	Item,
})
test('fails when value not valid', async () => {
	await testCreate({
		schema,
		entity: 'Item',
		data: { value: 'abcdef' },
		errors: ['failure'],
	})
})

test('succeeds when value valid', async () => {
	await testCreate({
		schema,
		entity: 'Item',
		data: { value: 'abc' },
		errors: [],
	})
})

test.run()
