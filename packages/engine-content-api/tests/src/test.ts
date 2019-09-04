import 'jasmine'
import { Acl, Model, Schema, Validation } from '@contember/schema'
import GraphQlSchemaBuilderFactory from '../../src/graphQLSchema/GraphQlSchemaBuilderFactory'
import { AllowAllPermissionFactory } from '@contember/schema-definition'
import { executeGraphQlTest } from './testGraphql'
import { Client } from '@contember/database'
import { createConnectionMock } from '@contember/database-tester'
import { ExecutionContainerFactory } from '../../src/graphQlResolver'
import { emptySchema } from '@contember/schema-utils'
import { createUuidGenerator } from '@contember/engine-api-tester'
import { graphqlObjectFactories } from './graphqlObjectFactories'
import { getArgumentValues } from 'graphql/execution/values'

export interface SqlQuery {
	sql: string
	parameters?: any[]
	response: any[] | any
}

export interface Test {
	schema: Model.Schema
	validation?: Validation.Schema
	permissions?: Acl.Permissions
	variables?: Acl.VariablesMap
	query: string
	queryVariables?: Record<string, any>
	executes: SqlQuery[]
	return: object
}

export const sqlTransaction = (executes: SqlQuery[]): SqlQuery[] => {
	return executes
}

export const execute = async (test: Test) => {
	const permissions: Acl.Permissions = test.permissions || new AllowAllPermissionFactory().create(test.schema)
	const builder = new GraphQlSchemaBuilderFactory(graphqlObjectFactories, getArgumentValues).create(
		test.schema,
		permissions,
	)
	const graphQLSchema = builder.build()

	const connection = createConnectionMock(test.executes, (expected, actual, message) => {
		expect(actual).toEqual(expected, message)
	})

	// @ts-ignore
	const db = new Client(connection, 'public')
	const schema: Schema = { ...emptySchema, model: test.schema, validation: test.validation || {} }
	await executeGraphQlTest({
		context: {
			db: db,
			identityVariables: test.variables || {},
			executionContainer: new ExecutionContainerFactory(schema, permissions, {
				uuid: createUuidGenerator(),
				now: () => new Date('2019-09-04 12:00'),
			}).create({
				db,
				identityVariables: test.variables || {},
			}),
			timer: (label: any, cb: any) => cb(),
		},
		query: test.query,
		queryVariables: test.queryVariables,
		return: test.return,
		schema: graphQLSchema,
	})
}
