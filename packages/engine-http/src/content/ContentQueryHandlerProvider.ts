import { ContentSchemaResolver } from './ContentSchemaResolver.js'
import { GraphQlSchemaFactory } from './GraphQlSchemaFactory.js'
import { ContentQueryHandlerFactory, KoaState } from './ContentQueryHandlerFactory.js'
import { GraphQLSchema } from 'graphql'
import { DatabaseContext } from '@contember/engine-system-api'
import { KoaMiddleware } from '../koa/index.js'
import { StageConfig } from '../ProjectConfig.js'

export class ContentQueryHandlerProvider {
	private cache = new WeakMap<GraphQLSchema, KoaMiddleware<KoaState>>()

	constructor(
		private readonly contentSchemaFactory: ContentSchemaResolver,
		private readonly graphqlSchemaFactory: GraphQlSchemaFactory,
		private readonly handlerFactory: ContentQueryHandlerFactory,
	) {}

	async get(db: DatabaseContext, stage: StageConfig, projectRoles: string[]): Promise<KoaMiddleware<KoaState>> {
		const schema = await this.contentSchemaFactory.getSchema(db, stage.slug)

		const [dataSchema, permissions] = await this.graphqlSchemaFactory.create(schema, {
			projectRoles: projectRoles,
		})
		const middleware = this.cache.get(dataSchema)
		if (middleware) {
			return middleware
		}

		const newMiddleware = this.handlerFactory.create(permissions, schema, dataSchema)
		this.cache.set(dataSchema, newMiddleware)
		return newMiddleware
	}
}
