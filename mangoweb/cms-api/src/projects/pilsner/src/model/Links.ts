import { BlogPage, Category, FrontPage, GenericPage, Post, Pub, PubsPage, Tag, Tapster, TapstersPage } from './'
import { SchemaDefinition as d } from 'cms-api'

export class Linkable {
	url = d
		.stringColumn()
		.notNull()
		.unique()

	redirect: d.OneHasOneDefinition = d.oneHasOne(Redirect, 'link')

	post: d.OneHasOneDefinition = d.oneHasOne(Post, 'link').cascadeOnDelete()
	tapster: d.OneHasOneDefinition = d.oneHasOne(Tapster, 'link').cascadeOnDelete()
	pub: d.OneHasOneDefinition = d.oneHasOne(Pub, 'link').cascadeOnDelete()
	tag: d.OneHasOneDefinition = d.oneHasOne(Tag, 'link').cascadeOnDelete()
	category: d.OneHasOneDefinition = d.oneHasOne(Category, 'link').cascadeOnDelete()

	frontPage: d.OneHasOneDefinition = d.oneHasOne(FrontPage, 'link').cascadeOnDelete()
	blogPage: d.OneHasOneDefinition = d.oneHasOne(BlogPage, 'link').cascadeOnDelete()
	pubsPage: d.OneHasOneDefinition = d.oneHasOne(PubsPage, 'link').cascadeOnDelete()
	tapstersPage: d.OneHasOneDefinition = d.oneHasOne(TapstersPage, 'link').cascadeOnDelete()
	genericPage: d.OneHasOneDefinition = d.oneHasOne(GenericPage, 'link').cascadeOnDelete()
}

export class Redirect {
	link = d.oneHasOneInversed(Linkable, 'redirect').notNull()
	target = d.manyHasOne(Linkable).notNull()
}
