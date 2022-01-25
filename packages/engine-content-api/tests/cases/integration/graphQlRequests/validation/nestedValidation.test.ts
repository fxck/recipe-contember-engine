import { createSchema, testCreate, testUpdate } from './utils.js'
import { InputValidation as v, SchemaDefinition as d } from '@contember/schema-definition'
import { testUuid } from '../../../../src/testUuid.js'
import { suite } from 'uvu'

const nestedValidationTest = suite('Nested validations')

nestedValidationTest('validates nested m:n create with an alias', async () => {
	class Post {
		title = d.stringColumn()
		tags: d.ManyHasManyDefinition = d.manyHasMany(Tag, 'posts')
	}

	class Tag {
		@v.required('Tag label is required')
		label = d.stringColumn()
		posts = d.manyHasManyInverse(Post, 'tags')
	}

	const schema = createSchema({ Post, Tag })
	await testCreate({
		schema,
		entity: 'Post',
		data: {
			title: 'Hello world',
			tags: [{ alias: 'foo', create: { label: null } }],
		},
		executes: [],
		errors: [
			{
				message: {
					text: 'Tag label is required',
				},
				path: [
					{
						field: 'tags',
					},
					{
						index: 0,
						alias: 'foo',
					},
					{
						field: 'label',
					},
				],
			},
		],
	})
})

nestedValidationTest('validates nested m:n update', async () => {
	class Post {
		title = d.stringColumn()
		tags: d.ManyHasManyDefinition = d.manyHasMany(Tag, 'posts')
	}

	class Tag {
		@v.required('Tag label is required')
		label = d.stringColumn()
		posts = d.manyHasManyInverse(Post, 'tags')
	}

	const schema = createSchema({ Post, Tag })
	await testUpdate({
		schema,
		entity: 'Post',
		by: { id: testUuid(1) },
		data: {
			tags: [{ alias: 'foo', create: { label: null } }],
		},
		executes: [],
		errors: ['Tag label is required'],
	})
})

nestedValidationTest('validates nested m:1 update', async () => {
	class Post {
		title = d.stringColumn()
		author = d.manyHasOne(Author, 'posts')
	}

	class Author {
		@v.required('Author name is required')
		name = d.stringColumn()
		posts: d.OneHasManyDefinition = d.oneHasMany(Post, 'author')
	}

	const schema = createSchema({ Post, Author })
	await testUpdate({
		schema,
		entity: 'Post',
		by: { id: testUuid(1) },
		data: {
			author: { create: { name: null } },
		},
		executes: [],
		errors: ['Author name is required'],
	})
})
nestedValidationTest.run()
