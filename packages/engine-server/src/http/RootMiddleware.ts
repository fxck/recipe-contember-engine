import {
	compose,
	createContentMiddleware,
	createDebugInfoMiddleware,
	createErrorResponseMiddleware,
	createHomepageMiddleware,
	createPlaygroundMiddleware,
	createPoweredByHeaderMiddleware,
	createServicesProviderMiddleware,
	createSystemMiddleware,
	createTenantMiddleware,
	createTimerMiddleware,
	KoaMiddleware,
	route,
	ServicesState,
} from '@contember/engine-http'
import prom from 'prom-client'
import koaCompress from 'koa-compress'
import bodyParser from 'koa-bodyparser'
import { createColllectHttpMetricsMiddleware } from './CollectHttpMetricsMiddelware'
import { Config } from '../config/config'
import { SystemGraphQLMiddlewareFactory, TenantGraphQLMiddlewareFactory } from '@contember/engine-http'

export const createRootMiddleware = (
	debug: boolean,
	version: string,
	services: ServicesState & {
		tenantGraphQlMiddlewareFactory: TenantGraphQLMiddlewareFactory
		systemGraphQLMiddlewareFactory: SystemGraphQLMiddlewareFactory
	},
	prometheusRegistry: prom.Registry,
	httpConfig: Config['server']['http'],
): KoaMiddleware<any> => {
	return compose([
		koaCompress({
			br: false,
		}),
		bodyParser({
			jsonLimit: httpConfig.requestBodySize || '1mb',
		}),
		createPoweredByHeaderMiddleware(debug, version),
		createColllectHttpMetricsMiddleware(prometheusRegistry),
		createDebugInfoMiddleware(debug),
		createServicesProviderMiddleware(services),
		createErrorResponseMiddleware(),
		createTimerMiddleware(),
		route('/playground$', createPlaygroundMiddleware()),
		createHomepageMiddleware(),
		createContentMiddleware(),
		createTenantMiddleware(services.tenantGraphQlMiddlewareFactory),
		createSystemMiddleware(services.systemGraphQLMiddlewareFactory),
	])
}
