import * as Schema from '../schema'
import { IResolvers } from 'graphql-tools'

export interface IgnoreIndex {
	[key: string]: any
}

export interface Resolver extends IResolvers {
	Query: Schema.QueryResolvers & IgnoreIndex
	Mutation: Schema.MutationResolvers & IgnoreIndex
}
