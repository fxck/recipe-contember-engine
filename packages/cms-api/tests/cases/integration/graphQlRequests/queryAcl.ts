import { execute, sqlTransaction } from '../../../src/test'
import { GQL, SQL } from '../../../src/tags'
import { testUuid } from '../../../src/testUuid'
import { SchemaBuilder } from '@contember/schema-definition'
import { Acl, Model } from '@contember/schema'
import 'mocha'

describe('Queries with acl', () => {
	describe('Post + PostLocale with title restricted by locale', () => {
		const schema = new SchemaBuilder()
			.enum('locale', ['cs', 'en'])
			.entity('Post', entityBuilder => entityBuilder.oneHasMany('locales', c => c.target('PostLocale')))
			.entity('PostLocale', entity =>
				entity
					.column('title', column => column.type(Model.ColumnType.String))
					.column('locale', column => column.type(Model.ColumnType.Enum, { enumName: 'locale' })),
			)
			.buildSchema()

		const permissions: Acl.Permissions = {
			Post: {
				predicates: {},
				operations: {
					read: {
						id: true,
						locales: true,
					},
				},
			},
			PostLocale: {
				predicates: {
					localePredicate: {
						locale: 'localeVariable',
					},
				},
				operations: {
					read: {
						id: true,
						title: 'localePredicate',
					},
				},
			},
		}

		it('querying id and title', async () => {
			await execute({
				schema: schema,
				permissions: permissions,
				variables: {
					localeVariable: ['cs'],
				},
				query: GQL`
        query {
          listPostLocale {
            id
            title
	          _meta {
		          title {
			          readable
			          updatable
		          }
	          }
          }
        }`,
				executes: [
					...sqlTransaction([
						{
							sql: SQL`select
                         "root_"."id" as "root_id",
                         case when "root_"."locale" in (?) then "root_"."title" else null end as "root_title",
                         "root_"."locale" in (?) as "root__meta_title_readable",
                         false as "root__meta_title_updatable"
                       from "public"."post_locale" as "root_"`,
							parameters: ['cs', 'cs'],
							response: {
								rows: [
									{
										root_id: testUuid(1),
										root_title: null,
										root__meta_title_readable: false,
										root__meta_title_updatable: false,
									},
									{
										root_id: testUuid(2),
										root_title: 'bar',
										root__meta_title_readable: true,
										root__meta_title_updatable: false,
									},
								],
							},
						},
					]),
				],
				return: {
					data: {
						listPostLocale: [
							{
								id: testUuid(1),
								title: null,
								_meta: {
									title: {
										readable: false,
										updatable: false,
									},
								},
							},
							{
								id: testUuid(2),
								title: 'bar',
								_meta: {
									title: {
										readable: true,
										updatable: false,
									},
								},
							},
						],
					},
				},
			})
		})

		it('querying with extra where', async () => {
			await execute({
				schema: schema,
				permissions: permissions,
				variables: {
					localeVariable: ['cs'],
				},
				query: GQL`
        query {
          listPostLocale(filter: {title: {eq: "foo"}}) {
            id
            title
          }
        }`,
				executes: [
					...sqlTransaction([
						{
							sql: SQL`select
                         "root_"."id" as "root_id",
                         case when "root_"."locale" in (?) then "root_"."title" else null end as "root_title"
                       from "public"."post_locale" as "root_"
                       where "root_"."title" = ? and "root_"."locale" in (?)`,
							parameters: ['cs', 'foo', 'cs'],
							response: {
								rows: [
									{
										root_id: testUuid(1),
										root_title: 'foo',
										root_title__readable: true,
									},
								],
							},
						},
					]),
				],
				return: {
					data: {
						listPostLocale: [
							{
								id: testUuid(1),
								title: 'foo',
							},
						],
					},
				},
			})
		})

		it('querying only id', async () => {
			await execute({
				schema: schema,
				permissions: permissions,
				variables: {
					localeVariable: ['cs'],
				},
				query: GQL`
        query {
          listPostLocale {
            id
          }
        }`,
				executes: [
					...sqlTransaction([
						{
							sql: SQL`select
                       "root_"."id" as "root_id"
                     from "public"."post_locale" as "root_"`,
							parameters: [],
							response: {
								rows: [
									{
										root_id: testUuid(1),
									},
								],
							},
						},
					]),
				],
				return: {
					data: {
						listPostLocale: [
							{
								id: testUuid(1),
							},
						],
					},
				},
			})
		})

		it('not defined acl variable', async () => {
			await execute({
				schema: schema,
				permissions: permissions,
				variables: {},
				query: GQL`
        query {
          listPostLocale {
            id
            title
          }
        }`,
				executes: [
					...sqlTransaction([
						{
							sql: SQL`select
                         "root_"."id" as "root_id",
                         case when false then "root_"."title" else null end as "root_title"
                       from "public"."post_locale" as "root_"`,
							parameters: [],
							response: {
								rows: [],
							},
						},
					]),
				],
				return: {
					data: {
						listPostLocale: [],
					},
				},
			})
		})

		it('querying on nested field', async () => {
			await execute({
				schema: schema,
				permissions: permissions,
				variables: {
					localeVariable: ['cs'],
				},
				query: GQL`
        query {
          listPost {
            locales {
              id
              title
            }
          }
        }`,
				executes: [
					...sqlTransaction([
						{
							sql: SQL`select 
                         "root_"."id" as "root_id",
                         "root_"."id" as "root_id"
                       from "public"."post" as "root_"`,
							parameters: [],
							response: {
								rows: [
									{
										root_id: testUuid(1),
									},
									{
										root_id: testUuid(2),
									},
								],
							},
						},
						{
							sql: SQL`select
                         "root_"."post_id" as "__grouping_key",
                         "root_"."id" as "root_id",
                         case when "root_"."locale" in (?) then "root_"."title" else null end as "root_title"
                       from "public"."post_locale" as "root_"
                       where "root_"."post_id" in (?, ?) and false`,
							parameters: ['cs', testUuid(1), testUuid(2)],
							response: {
								rows: [
									{
										__grouping_key: testUuid(1),
										root_id: testUuid(3),
										root_title: null,
									},
									{
										__grouping_key: testUuid(2),
										root_id: testUuid(4),
										root_title: 'bar',
									},
								],
							},
						},
					]),
				],
				return: {
					data: {
						listPost: [
							{
								locales: [
									{
										id: testUuid(3),
										title: null,
									},
								],
							},
							{
								locales: [
									{
										id: testUuid(4),
										title: 'bar',
									},
								],
							},
						],
					},
				},
			})
		})
	})

	describe('Post + author restricted by country', () => {
		const schema = new SchemaBuilder()
			.enum('locale', ['cs', 'en'])
			.entity('Post', entityBuilder =>
				entityBuilder.manyHasOne('author', r =>
					r.target('Author', e =>
						e
							.column('name', c => c.type(Model.ColumnType.String))
							.manyHasOne('country', r =>
								r.target('Country', e => e.column('name', c => c.type(Model.ColumnType.String))),
							),
					),
				),
			)
			.buildSchema()

		const permissions: Acl.Permissions = {
			Post: {
				predicates: {},
				operations: {
					read: {
						id: true,
						author: true,
					},
				},
			},
			Author: {
				predicates: {
					countryPredicate: {
						country: {
							name: 'countryVariable',
						},
					},
				},
				operations: {
					read: {
						id: true,
						name: 'countryPredicate',
					},
				},
			},
			Country: {
				predicates: {},
				operations: {
					read: {
						id: true,
					},
				},
			},
		}

		it('querying post + author name', async () => {
			await execute({
				schema: schema,
				permissions: permissions,
				variables: {
					countryVariable: ['Czechia'],
				},
				query: GQL`
        query {
          listPost {
            id
            author {
              name
            }
          }
        }`,
				executes: [
					...sqlTransaction([
						{
							sql: SQL`select
                         "root_"."id" as "root_id",
                         "root_"."author_id" as "root_author"
                       from "public"."post" as "root_"`,
							parameters: [],
							response: {
								rows: [
									{
										root_id: testUuid(1),
										root_author: testUuid(3),
									},
									{
										root_id: testUuid(2),
										root_author: testUuid(4),
									},
								],
							},
						},
						{
							sql: SQL`select
                         "root_"."id" as "root_id",
                         case when "root_country"."name" in (?) then "root_"."name" else null end as "root_name",
                         "root_"."id" as "root_id"
                       from "public"."author" as "root_" left join "public"."country" as "root_country" on "root_"."country_id" = "root_country"."id"
                       where "root_"."id" in (?, ?)`,
							parameters: ['Czechia', testUuid(3), testUuid(4)],
							response: {
								rows: [
									{
										root_id: testUuid(3),
										root_name: 'John',
									},
								],
							},
						},
					]),
				],
				return: {
					data: {
						listPost: [
							{
								author: {
									name: 'John',
								},
								id: testUuid(1),
							},
							{
								author: null,
								id: testUuid(2),
							},
						],
					},
				},
			})
		})
	})
})
