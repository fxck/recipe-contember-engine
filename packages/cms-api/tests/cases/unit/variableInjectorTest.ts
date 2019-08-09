import 'mocha'
import { expect } from 'chai'
import VariableInjector from '../../../src/acl/VariableInjector'
import { SchemaBuilder } from '@contember/schema-definition'
import { Model } from '@contember/schema'

describe('variable injector', () => {
	it('injects variable', () => {
		const schema = new SchemaBuilder()
			.enum('locale', ['cs', 'en'])
			.entity('PostLocale', e =>
				e
					.column('locale', c => c.type(Model.ColumnType.Enum, { enumName: 'locale' }))
					.column('foo', c => c.type(Model.ColumnType.String))
					.column('public', c => c.type(Model.ColumnType.Bool))
					.manyHasOne('post', r => r.target('Post', e => e.manyHasOne('site', r => r.target('Site', e => e)))),
			)
			.buildSchema()

		const injector = new VariableInjector(schema, {
			site: [1, 2],
			locale: 'cs',
		})
		const result = injector.inject(schema.entities['PostLocale'], {
			or: [
				{
					public: { eq: true },
				},
				{
					and: [
						{
							post: {
								site: 'site',
							},
						},
						{
							locale: 'locale',
						},
						{
							foo: 'bar',
						},
					],
				},
			],
		})

		expect(result).deep.eq({
			or: [
				{
					public: { eq: true },
				},
				{
					and: [
						{
							post: {
								site: { id: { in: [1, 2] } },
							},
						},
						{
							locale: { eq: 'cs' },
						},
						{
							foo: { never: true },
						},
					],
				},
			],
		})
	})
})
