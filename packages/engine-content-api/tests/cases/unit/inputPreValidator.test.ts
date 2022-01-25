import {
	ColumnValueResolver,
	Dependencies,
	InputPreValidator,
	ValidationDataSelector,
} from '../../../src/input-validation/index.js'
import { InputValidation as v, SchemaBuilder, SchemaDefinition, SchemaDefinition as def } from '@contember/schema-definition'
import { Input, Model, Validation, Value } from '@contember/schema'
import { EntityRulesResolver } from '../../../src/index.js'
import { getEntity } from '@contember/schema-utils'
import { Mapper } from '../../../src/mapper/index.js'
import { createMock } from '../../src/utils.js'
import { testUuid } from '../../src/testUuid.js'
import * as assert from 'uvu/assert'
import { suite } from 'uvu'

type PrimaryValueExpectation = { entity: string; where: Input.UniqueWhere; result: Value.PrimaryValue }
type SelectExpectation = {
	entity: string
	where: Input.UniqueWhere
	dependencies: Dependencies
	result: Value.Object
}

const createDataSelectorMock = (primaryValues: PrimaryValueExpectation[], selects: SelectExpectation[]) => {
	return createMock<ValidationDataSelector>({
		getPrimaryValue: async (mapper: Mapper, entity: Model.Entity, where: Input.UniqueWhere) => {
			const entry = primaryValues.shift()
			//console.log(JSON.stringify({ entity: entity.name, where, result: undefined }))
			if (!entry) {
				throw new Error(`Unexpected getPrimaryValue call`)
			}
			assert.is(entity.name, entry.entity)
			assert.equal(where, entry.where)
			return entry.result
		},
		select: async (
			mapper: Mapper,
			entity: Model.Entity,
			where: Input.UniqueWhere<never>,
			dependencies: Dependencies,
		) => {
			if (Object.keys(dependencies).length === 0) {
				return {}
			}
			const entry = selects.shift()
			if (!entry) {
				console.log(JSON.stringify({ entity: entity.name, where, dependencies, result: {} }))
				throw new Error(`Unexpected select call`)
			}
			assert.is(entity.name, entry.entity)
			assert.equal(where, entry.where)
			//console.log(JSON.stringify(entry))
			assert.equal(dependencies, entry.dependencies)
			return entry.result
		},
	})
}

const createValidator = ({
	model,
	validation,
	primaryValues,
	selects,
}: {
	model: Model.Schema
	validation: Validation.Schema
	primaryValues?: PrimaryValueExpectation[]
	selects?: SelectExpectation[]
}) =>
	new InputPreValidator(
		model,
		new EntityRulesResolver(validation, model),
		new ColumnValueResolver({
			uuid: () => '00000000-0000-0000-0000-000000000000',
			now: () => new Date(),
		}),
		createDataSelectorMock(primaryValues || [], selects || []),
	)
const mapper = {} as Mapper

const inputPreValidatorTest = suite('Input pre-validator')
inputPreValidatorTest('validates implicit rules', async () => {
	const model = new SchemaBuilder()
		.entity('Book', e => e.column('title', c => c.notNull().type(Model.ColumnType.String)).column('description'))
		.buildSchema()

	const validator = createValidator({ model, validation: {} })
	const result = await validator.validateCreate({
		entity: getEntity(model, 'Book'),
		data: {},
		overRelation: null,
		path: [],
		mapper,
	})
	assert.equal(result, [
		{
			path: [
				{
					field: 'title',
				},
			],
			message: {
				text: 'Field is required',
			},
		},
	])
})

inputPreValidatorTest('validates explicit rules', async () => {
	const model = new SchemaBuilder()
		.entity('Book', e => e.column('title', c => c.notNull().type(Model.ColumnType.String)).column('description'))
		.buildSchema()

	const validator = createValidator({
		model,
		validation: {
			Book: {
				description: [{ message: { text: 'Minimum length is 10 characters' }, validator: v.rules.minLength(10) }],
			},
		},
	})
	const result = await validator.validateCreate({
		entity: getEntity(model, 'Book'),
		data: {
			title: 'Hello',
			description: 'World',
		},
		overRelation: null,
		path: [],
		mapper,
	})
	assert.equal(result, [
		{
			path: [
				{
					field: 'description',
				},
			],
			message: {
				text: 'Minimum length is 10 characters',
			},
		},
	])

	const result2 = await validator.validateCreate({
		entity: getEntity(model, 'Book'),
		data: {
			title: 'Hello',
			description: 'World abcdef',
		},
		overRelation: null,
		path: [],
		mapper,
	})
	assert.equal(result2, [])
})

inputPreValidatorTest('dependent rules invalid', async () => {
	const model = new SchemaBuilder()
		.entity('Book', e => e.column('title', c => c.notNull().type(Model.ColumnType.String)).column('description'))
		.buildSchema()

	const rule = v.rules.conditional(v.rules.on('title', v.rules.notEmpty()), v.rules.minLength(10))
	const validator = createValidator({
		model,
		validation: {
			Book: {
				description: [{ message: { text: 'Minimum length is 10 characters' }, validator: rule }],
			},
		},
	})
	const result = await validator.validateCreate({
		entity: getEntity(model, 'Book'),
		data: {
			title: 'Hello',
			description: 'World',
		},
		overRelation: null,
		path: [],
		mapper,
	})
	assert.equal(result, [
		{
			path: [
				{
					field: 'description',
				},
			],
			message: {
				text: 'Minimum length is 10 characters',
			},
		},
	])
})

inputPreValidatorTest('dependent rules valid', async () => {
	const model = new SchemaBuilder()
		.entity('Book', e => e.column('title', c => c.notNull().type(Model.ColumnType.String)).column('description'))
		.buildSchema()

	const rule = v.rules.conditional(v.rules.on('title', v.rules.notEmpty()), v.rules.minLength(10))
	const validator = createValidator({
		model,
		validation: {
			Book: {
				description: [{ message: { text: 'Minimum length is 10 characters' }, validator: rule }],
			},
		},
	})
	const result = await validator.validateCreate({
		entity: getEntity(model, 'Book'),
		data: {
			title: '',
			description: 'World',
		},
		overRelation: null,
		path: [],
		mapper,
	})
	assert.equal(result, [])
})

inputPreValidatorTest('rules on relations', async () => {
	const model = new SchemaBuilder()
		.entity('Book', e =>
			e
				.column('title', c => c.notNull().type(Model.ColumnType.String))
				.manyHasOne('author', r => r.target('Author', e => e.column('name')).notNull()),
		)
		.buildSchema()

	const validator = createValidator({ model, validation: {} })
	const result = await validator.validateCreate({
		entity: getEntity(model, 'Book'),
		data: {
			title: 'Hello',
		},
		overRelation: null,
		path: [],
		mapper,
	})
	assert.equal(result, [
		{
			path: [
				{
					field: 'author',
				},
			],
			message: {
				text: 'Field is required',
			},
		},
	])
})

inputPreValidatorTest('validates update', async () => {
	const model = new SchemaBuilder()
		.entity('Book', e => e.column('title', c => c.notNull().type(Model.ColumnType.String)).column('description'))
		.buildSchema()

	const validator = createValidator({
		model,
		validation: {
			Book: {
				description: [{ message: { text: 'Minimum length is 10 characters' }, validator: v.rules.minLength(10) }],
			},
		},
	})
	const result = await validator.validateUpdate({
		entity: getEntity(model, 'Book'),
		data: {
			description: 'World',
		},
		where: {},
		path: [],
		mapper,
	})
	assert.equal(result, [
		{
			path: [
				{
					field: 'description',
				},
			],
			message: {
				text: 'Minimum length is 10 characters',
			},
		},
	])
})

inputPreValidatorTest('validate update w dependent rules - invalid', async () => {
	const model = new SchemaBuilder()
		.entity('Book', e => e.column('title', c => c.notNull().type(Model.ColumnType.String)).column('description'))
		.buildSchema()

	const rule = v.rules.conditional(v.rules.on('title', v.rules.notEmpty()), v.rules.minLength(10))
	const validator = createValidator({
		model,
		validation: {
			Book: {
				description: [{ message: { text: 'Minimum length is 10 characters' }, validator: rule }],
			},
		},
		selects: [
			{
				entity: 'Book',
				where: { id: testUuid(1) },
				dependencies: { title: {} },
				result: { title: 'abcd' },
			},
		],
	})
	const result = await validator.validateUpdate({
		entity: getEntity(model, 'Book'),
		data: {
			description: 'World',
		},
		where: { id: testUuid(1) },
		path: [],
		mapper,
	})
	assert.equal(result, [
		{
			path: [
				{
					field: 'description',
				},
			],
			message: {
				text: 'Minimum length is 10 characters',
			},
		},
	])
})

inputPreValidatorTest('validate update w dependent rules - valid', async () => {
	const model = new SchemaBuilder()
		.entity('Book', e => e.column('title', c => c.notNull().type(Model.ColumnType.String)).column('description'))
		.buildSchema()

	const rule = v.rules.conditional(v.rules.on('title', v.rules.notEmpty()), v.rules.minLength(10))
	const validator = createValidator({
		model,
		validation: {
			Book: {
				description: [{ message: { text: 'Minimum length is 10 characters' }, validator: rule }],
			},
		},
		selects: [
			{
				entity: 'Book',
				where: { id: testUuid(1) },
				dependencies: { title: {} },
				result: { title: '' },
			},
		],
	})
	const result = await validator.validateUpdate({
		entity: getEntity(model, 'Book'),
		data: {
			description: 'World',
		},
		where: { id: testUuid(1) },
		path: [],
		mapper,
	})
	assert.equal(result, [])
})

inputPreValidatorTest('validate update with dependent rules on relation - invalid', async () => {
	const model = new SchemaBuilder()
		.entity('Article', e =>
			e
				.column('publishedAt', c => c.type(Model.ColumnType.DateTime))
				.manyHasOne('image', image => image.target('Image', e => e.column('url'))),
		)
		.buildSchema()

	const rule = v.rules.conditional(v.rules.on('publishedAt', v.rules.notNull()), v.rules.defined())
	const validator = createValidator({
		model,
		validation: {
			Article: {
				image: [{ message: { text: 'Published article must have an image' }, validator: rule }],
			},
		},
		selects: [
			{
				entity: 'Article',
				where: { id: testUuid(1) },
				dependencies: { image: {} },
				result: { id: testUuid(1), image: null },
			},
		],
	})
	const result = await validator.validateUpdate({
		entity: getEntity(model, 'Article'),
		data: {
			publishedAt: 'now',
		},
		where: { id: testUuid(1) },
		path: [],
		mapper,
	})
	assert.equal(result, [
		{
			path: [
				{
					field: 'image',
				},
			],
			message: {
				text: 'Published article must have an image',
			},
		},
	])
})


namespace ViewModelDefinition {
	export class Book {
		title = def.stringColumn()
		stats = def.oneHasOneInverse(BookStats, 'book').notNull()
	}

	@def.View('SELECT 1')
	export class BookStats {
		book = def.oneHasOne(Book, 'stats').notNull()
		foo = def.intColumn()
	}
}

inputPreValidatorTest('ignore not null on view relation', async () => {
	const model = SchemaDefinition.createModel(ViewModelDefinition)

	const validator = createValidator({ model, validation: {} })
	const result = await validator.validateCreate({
		entity: getEntity(model, 'Book'),
		data: {
			title: 'Hello',
		},
		overRelation: null,
		path: [],
		mapper,
	})
	assert.equal(result, [])
})


inputPreValidatorTest.run()
