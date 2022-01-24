import { compose, KoaMiddleware } from '../koa/index.js'
import { createModuleInfoMiddleware } from './ModuleInfoMiddleware.js'
import corsMiddleware from '@koa/cors'
import { AuthMiddlewareFactory } from './AuthMiddleware.js'
import { ProjectGroupMiddlewareFactory } from '../project-common/index.js'

type KoaState = unknown

export class ApiMiddlewareFactory {
	constructor(
		private readonly projectGroupMiddlewareFactory: ProjectGroupMiddlewareFactory,
		private readonly authMiddlewareFactory: AuthMiddlewareFactory,
	) {
	}

	public create(module: string): KoaMiddleware<KoaState> {
		return compose([
			this.projectGroupMiddlewareFactory.create(),
			createModuleInfoMiddleware(module),
			corsMiddleware(),
			this.authMiddlewareFactory.create(),
		])
	}
}
