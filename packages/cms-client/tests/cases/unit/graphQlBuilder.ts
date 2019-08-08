import 'mocha'
import { expect } from 'chai'
import { GraphQlBuilder } from '../../../src'

describe('GraphQlQueryBuilder', () => {
	it('construct simple query', () => {
		const query = new GraphQlBuilder.QueryBuilder().query(builder =>
			builder
				.object('Post', object =>
					object
						.argument('where', { id: '123' })
						.field('id')
						.field('publishedAt')
						.fragment('Article', new GraphQlBuilder.ObjectBuilder().field('leadParagraph'))
						.fragment(
							'BlogPost',
							new GraphQlBuilder.ObjectBuilder().object('comments', new GraphQlBuilder.ObjectBuilder().field('id')),
						)
						.object(
							'locales',
							new GraphQlBuilder.ObjectBuilder()
								.argument('where', { locale: { eq: new GraphQlBuilder.Literal('cs') } })
								.field('id')
								.field('title'),
						),
				)
				.object('Authors', o => o.field('id')),
		)
		expect(query).equals(`query {
	Post(where: {id: "123"}) {
		id
		publishedAt
		... on Article {
			leadParagraph
		}
		... on BlogPost {
			comments {
				id
			}
		}
		locales(where: {locale: {eq: cs}}) {
			id
			title
		}
	}
	Authors {
		id
	}
}`)
	})
})
