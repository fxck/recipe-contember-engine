import { GraphQlBuilder } from '../index'

export type Mutations = 'create' | 'update' | 'delete'

export type Queries = 'get' | 'list'

export type GetQueryArguments = 'by'

export type ListQueryArguments = 'filter' | 'orderBy' | 'offset' | 'limit'

export type CreateMutationArguments = 'data'

export type UpdateMutationArguments = 'data' | 'by'

export type DeleteMutationArguments = 'by'

export type ReductionArguments = 'filter' | 'by'

export type HasOneArguments = 'filter'

export type HasManyArguments = 'filter' | 'orderBy' | 'offset' | 'limit'

export type UpdateMutationFields = 'ok' | 'validation' | 'node'

export type CreateMutationFields = 'ok' | 'validation' | 'node'

export type DeleteMutationFields = 'ok' | 'node'

export type WriteArguments = CreateMutationArguments | UpdateMutationArguments | DeleteMutationArguments

export type WriteFields = UpdateMutationFields | CreateMutationFields

export type ReadArguments = GetQueryArguments | ListQueryArguments | HasOneArguments | HasManyArguments

export interface WriteRelationOps {
	create: 'create' | 'connect'
	update: 'create' | 'connect' | 'delete' | 'disconnect' | 'update' | 'upsert'
}

export type OrderDirection = GraphQlBuilder.Literal<'asc'> | GraphQlBuilder.Literal<'desc'>

// TODO Silly enums because TS does not support enum extension 🙄
// https://github.com/Microsoft/TypeScript/issues/17592
export namespace WriteOperation {
	export interface Operation {
		op: 'create' | 'update' | 'delete'
	}
	export abstract class Operation implements Operation {}

	export interface ContentfulOperation {
		op: 'create' | 'update'
	}
	export abstract class ContentfulOperation extends Operation implements ContentfulOperation {}

	export class Update extends ContentfulOperation {
		readonly op = 'update' as const
	}

	export class Create extends ContentfulOperation {
		readonly op = 'create' as const
	}

	export class Delete extends Operation {
		readonly op = 'delete' as const
	}
}
