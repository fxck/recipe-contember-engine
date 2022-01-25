import supertest from 'supertest'
import { MasterContainerFactory, ProcessType } from '../../src/index.js'
import { getExampleProjectDirectory, recreateDatabase } from '@contember/engine-api-tester'
import * as nodeAssert from 'assert'
import * as assert from 'uvu/assert'
import { test } from 'uvu'
import prom from 'prom-client'
import { MigrationFilesManager, MigrationsResolver } from '@contember/schema-migrations'
import { Logger } from '@contember/engine-common'
import { CreateProjectCommand, DatabaseContext } from '@contember/engine-tenant-api'
import { ConflictActionType, InsertBuilder } from '@contember/database'
import uuid from 'uuid'

const dbCredentials = (dbName: string) => {
	return {
		host: String(process.env.TEST_DB_HOST),
		port: Number(process.env.TEST_DB_PORT),
		user: String(process.env.TEST_DB_USER),
		password: String(process.env.TEST_DB_PASSWORD),
		database: dbName,
	}
}

const rootToken = String(process.env.CONTEMBER_ROOT_TOKEN)
const loginToken = String(process.env.CONTEMBER_LOGIN_TOKEN)

// Used to allow prettier formatting of GraphQL queries
const gql = (strings: TemplateStringsArray) => {
	nodeAssert.strictEqual(strings.length, 1)
	return strings[0]
}

const projectConfig = {
	db: dbCredentials(String(process.env.TEST_DB_NAME)),
	name: 'test',
	slug: 'test',
	stages: [{ name: 'prod', slug: 'prod' }],
}
const createContainer = (debug: boolean) => {
	prom.register.clear()
	return new MasterContainerFactory().create({
		debugMode: debug,
		config: {
			tenant: {
				db: dbCredentials(String(process.env.TEST_DB_NAME_TENANT)),
				mailer: {},
				credentials: {
					rootToken,
					loginToken,
				},
				secrets: {},
			},
			server: {
				logging: {},
				port: 0,
				monitoringPort: 0,
				http: {},
			},
		},
		projectConfigResolver: () => projectConfig,
		plugins: [],
		processType: ProcessType.singleNode,
	})
}

const executeGraphql = (
	query: string,
	options: { authorizationToken?: string; path?: string; variables?: Record<string, any>; debug?: boolean } = {},
) => {
	const container = createContainer(options.debug || false)
	return supertest(container.koa.callback())
		.post(options.path || '/content/test/prod')
		.set('Authorization', 'Bearer ' + (options.authorizationToken || rootToken))
		.send({
			query,
			variables: options.variables || {},
		})
}

const signIn = async (email: string, password: string): Promise<string> => {
	const response2 = await executeGraphql(
		gql`
			mutation ($email: String!, $password: String!) {
				signIn(email: $email, password: $password) {
					ok
					result {
						token
					}
				}
			}
		`,
		{
			variables: { email, password },
			authorizationToken: loginToken,
			path: '/tenant',
		},
	)

	return response2.body.data.signIn.result.token
}

test.before(async () => {
	try {
		const connection = await recreateDatabase(String(process.env.TEST_DB_NAME))
		await connection.end()
		const tenantConnection = await recreateDatabase(String(process.env.TEST_DB_NAME_TENANT))
		const migrationsResolver = new MigrationsResolver(
			MigrationFilesManager.createForProject(getExampleProjectDirectory(), 'sample'),
		)
		const container = createContainer(false)
		await container.initializer.initialize()
		await container.initializer.createProject(projectConfig, await migrationsResolver.getMigrations())
		await tenantConnection.end()
	} catch (e) {
		// eslint-disable-next-line no-console
		console.error(e)
		process.exit(1)
	}
})

test('show homepage', async () => {
	await supertest(createContainer(false).koa.callback()) //
		.get('/')
		.expect(200)
		.expect('App is running')
})

test('Content API: create & read tag', async () => {
	await executeGraphql(
		gql`
			mutation {
				createTag(data: { label: "graphql" }) {
					ok
				}
			}
		`,
	)
		.expect(response => {
			assert.equal(response.body.data, {
				createTag: {
					ok: true,
				},
			})
		})
		.expect(200)

	await executeGraphql(
		gql`
			query {
				listTag(filter: { label: { eq: "graphql" } }) {
					label
				}
			}
		`,
	)
		.expect(response => {
			assert.equal(response.body.data, {
				listTag: [
					{
						label: 'graphql',
					},
				],
			})
		})
		.expect(200)
})

test('Content API: X-Contember-Ref header', async () => {
	await executeGraphql(
		gql`
			mutation {
				createTag(data: { label: "typescript" }) {
					ok
				}
			}
		`,
	).expect(200)

	const response = await executeGraphql(
		gql`
			query {
				listTag(filter: { label: { eq: "typescript" } }) {
					label
				}
			}
		`,
	)
		.set('X-Contember-Ref', 'None')
		.expect(response => {
			assert.equal(response.body.data, {
				listTag: [
					{
						label: 'typescript',
					},
				],
			})
		})
		.expect(200)
	const eventKey = response.get('X-Contember-Ref')
	await executeGraphql(
		gql`
			query {
				listTag {
					label
				}
			}
		`,
	)
		.set('X-Contember-Ref', eventKey)
		.expect(304)

	// ignored for mutation
	await executeGraphql(
		gql`
			mutation {
				createTag(data: { label: "typescript" }) {
					ok
				}
			}
		`,
	)
		.set('X-Contember-Ref', eventKey)
		.expect(200)
})

test('Content API: invalid schema error', async () => {
	await executeGraphql(
		gql`
			mutation {
				createFoo(data: { label: "graphql" }) {
					ok
				}
			}
		`,
	)
		.expect(400)
		.expect(response => {
			assert.equal(
				response.body.errors[0].message,
				'Cannot query field "createFoo" on type "Mutation". Did you mean "createPost" or "createTag"?',
			)
		})
})

test('Tenant API: sign up, add to a project and check project access', async () => {
	const signUpResponse = await executeGraphql(
		gql`
			mutation {
				signUp(email: "john@doe.com", password: "123456") {
					ok
					result {
						person {
							identity {
								id
							}
						}
					}
				}
			}
		`,
		{ path: '/tenant' },
	).expect(200)

	const identityId = signUpResponse.body.data.signUp.result.person.identity.id

	const authKey = await signIn('john@doe.com', '123456')
	await executeGraphql(
		gql`
			query {
				listTag {
					id
				}
			}
		`,
		{ authorizationToken: authKey },
	)
		.expect(404)
		.expect({ errors: [{ message: 'Project test NOT found', code: 404 }] })

	await executeGraphql(
		gql`
			query {
				listTag {
					id
				}
			}
		`,
		{ authorizationToken: authKey, debug: true },
	)
		.expect(403)
		.expect({
			errors: [{ message: 'You are not allowed to access project test', code: 403 }],
			identity: { roles: ['person'] },
		})

	await executeGraphql(
		gql`
			mutation ($identity: String!) {
				addProjectMember(identityId: $identity, projectSlug: "test", memberships: [{ role: "admin", variables: [] }]) {
					ok
				}
			}
		`,
		{ path: '/tenant', variables: { identity: identityId } },
	)
		.expect(200)
		.expect(response => {
			assert.equal(response.body.data, { addProjectMember: { ok: true } })
		})

	await executeGraphql(
		gql`
			query {
				listAuthor {
					id
				}
			}
		`,
		{ authorizationToken: authKey },
	)
		.expect(response => {
			assert.equal(response.body.data, { listAuthor: [] })
		})
		.expect(200)
})

test.run()
