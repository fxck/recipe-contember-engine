import { Model } from 'cms-common'
import { execute, sqlTransaction } from '../../src/test'
import { GQL, SQL } from '../../src/tags'
import { testUuid } from '../../src/testUuid'
import SchemaBuilder from '../../../src/content-schema/builder/SchemaBuilder'
import 'mocha'

it('Filter by has many with additional join', async () => {
	await execute({
		schema: new SchemaBuilder()
			.entity('Language', entity => entity.column('slug', column => column.type(Model.ColumnType.String).unique()))
			.entity('Person', entity =>
				entity.column('shortName').oneHasMany('locales', relation =>
					relation
						.target('PersonLocale')
						.onDelete(Model.OnDelete.cascade)
						.ownedBy('person')
						.ownerNotNull(),
				),
			)
			.entity('PersonLocale', entity =>
				entity
					.unique(['locale', 'person'])
					.manyHasOne('locale', relation => relation.target('Language').notNull())
					.column('urlSlug'),
			)

			.buildSchema(),
		query: GQL`
      query {
        teamMembers: listPerson(
          filter: {
            locales: {
              and: [
                { locale: { slug: { eq: "cs" } } },
                { urlSlug: { null: false } }
              ]
            }
          }
        ) {
          id
          shortName

          locale: localesByLocale(by: { locale: { slug: "cs" } }) {
            urlSlug
          }
        }
      }
		`,
		executes: [
			...sqlTransaction([
				{
					sql: SQL`
select "root_"."id" as "root_id", "root_"."short_name" as "root_shortName", "root_"."id" as "root_id" 
from "public"."person" as "root_" 
where "root_"."id" in (select "root_"."person_id" 
  from "public"."person_locale" as "root_" 
    left join "public"."language" as "root_locale" on "root_"."locale_id" = "root_locale"."id" 
  where "root_locale"."slug" = ? and not("root_"."url_slug" is null))`,
					response: { rows: [{ root_id: testUuid(1), root_shortName: 'John' }] },
					parameters: ['cs'],
				},
				{
					sql: SQL`select "root_"."person_id" as "root_person", "root_"."url_slug" as "root_urlSlug", "root_"."id" as "root_id"
from "public"."person_locale" as "root_" 
left join "public"."language" as "root_locale" on "root_"."locale_id" = "root_locale"."id" 
where "root_locale"."slug" = ? and "root_"."person_id" in (?)`,
					parameters: ['cs', testUuid(1)],
					response: {
						rows: [{ root_person: testUuid(1), root_urlSlug: 'john', root_id: testUuid(2) }],
					},
				},
			]),
		],
		return: {
			data: {
				teamMembers: [
					{
						id: testUuid(1),
						locale: {
							urlSlug: 'john',
						},
						shortName: 'John',
					},
				],
			},
		},
	})
})
