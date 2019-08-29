import { GraphQLResolveInfo } from 'graphql'
export type Maybe<T> = T | null
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
	ID: string
	String: string
	Boolean: boolean
	Int: number
	Float: number
}

export type _AnyValue = _IntValue | _StringValue | _BooleanValue | _FloatValue | _UndefinedValue

export type _Argument = _ValidatorArgument | _PathArgument | _LiteralArgument

export type _BooleanValue = {
	__typename?: '_BooleanValue'
	readonly booleanValue: Scalars['Boolean']
}

export type _Entity = {
	__typename?: '_Entity'
	readonly name: Scalars['String']
	readonly fields: ReadonlyArray<_Field>
}

export type _Enum = {
	__typename?: '_Enum'
	readonly name: Scalars['String']
	readonly values: ReadonlyArray<Scalars['String']>
}

export type _Field = {
	__typename?: '_Field'
	readonly name: Scalars['String']
	readonly rules: ReadonlyArray<_Rule>
	readonly validators: ReadonlyArray<_Validator>
}

export type _FloatValue = {
	__typename?: '_FloatValue'
	readonly floatValue: Scalars['Float']
}

export type _IntValue = {
	__typename?: '_IntValue'
	readonly intValue: Scalars['Int']
}

export type _LiteralArgument = {
	__typename?: '_LiteralArgument'
	readonly value?: Maybe<_AnyValue>
}

export type _PathArgument = {
	__typename?: '_PathArgument'
	readonly path: ReadonlyArray<Scalars['String']>
}

export type _Rule = {
	__typename?: '_Rule'
	readonly message?: Maybe<_RuleMessage>
	readonly validator: Scalars['Int']
}

export type _RuleMessage = {
	__typename?: '_RuleMessage'
	readonly text?: Maybe<Scalars['String']>
}

export type _Schema = {
	__typename?: '_Schema'
	readonly enums: ReadonlyArray<_Enum>
	readonly entities: ReadonlyArray<_Entity>
}

export type _StringValue = {
	__typename?: '_StringValue'
	readonly stringValue: Scalars['String']
}

export type _UndefinedValue = {
	__typename?: '_UndefinedValue'
	readonly undefinedValue: Scalars['Boolean']
}

export type _Validator = {
	__typename?: '_Validator'
	readonly operation: Scalars['String']
	readonly arguments: ReadonlyArray<_Argument>
}

export type _ValidatorArgument = {
	__typename?: '_ValidatorArgument'
	readonly validator: Scalars['Int']
}

export type Query = {
	__typename?: 'Query'
	readonly schema?: Maybe<_Schema>
}

export type ResolverTypeWrapper<T> = Promise<T> | T

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
	parent: TParent,
	args: TArgs,
	context: TContext,
	info: GraphQLResolveInfo,
) => Promise<TResult> | TResult

export type StitchingResolver<TResult, TParent, TContext, TArgs> = {
	fragment: string
	resolve: ResolverFn<TResult, TParent, TContext, TArgs>
}

export type Resolver<TResult, TParent = {}, TContext = {}, TArgs = {}> =
	| ResolverFn<TResult, TParent, TContext, TArgs>
	| StitchingResolver<TResult, TParent, TContext, TArgs>

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
	parent: TParent,
	args: TArgs,
	context: TContext,
	info: GraphQLResolveInfo,
) => AsyncIterator<TResult> | Promise<AsyncIterator<TResult>>

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
	parent: TParent,
	args: TArgs,
	context: TContext,
	info: GraphQLResolveInfo,
) => TResult | Promise<TResult>

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
	subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>
	resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
	subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>
	resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
	| SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
	| SubscriptionResolverObject<TResult, TParent, TContext, TArgs>

export type SubscriptionResolver<TResult, TKey extends string, TParent = {}, TContext = {}, TArgs = {}> =
	| ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
	| SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>

export type TypeResolveFn<TTypes, TParent = {}, TContext = {}> = (
	parent: TParent,
	context: TContext,
	info: GraphQLResolveInfo,
) => Maybe<TTypes>

export type NextResolverFn<T> = () => Promise<T>

export type DirectiveResolverFn<TResult = {}, TParent = {}, TContext = {}, TArgs = {}> = (
	next: NextResolverFn<TResult>,
	parent: TParent,
	args: TArgs,
	context: TContext,
	info: GraphQLResolveInfo,
) => TResult | Promise<TResult>

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = {
	Query: ResolverTypeWrapper<{}>
	_Schema: ResolverTypeWrapper<_Schema>
	_Enum: ResolverTypeWrapper<_Enum>
	String: ResolverTypeWrapper<Scalars['String']>
	_Entity: ResolverTypeWrapper<_Entity>
	_Field: ResolverTypeWrapper<_Field>
	_Rule: ResolverTypeWrapper<_Rule>
	_RuleMessage: ResolverTypeWrapper<_RuleMessage>
	Int: ResolverTypeWrapper<Scalars['Int']>
	_Validator: ResolverTypeWrapper<Omit<_Validator, 'arguments'> & { arguments: Array<ResolversTypes['_Argument']> }>
	_Argument: ResolversTypes['_ValidatorArgument'] | ResolversTypes['_PathArgument'] | ResolversTypes['_LiteralArgument']
	_ValidatorArgument: ResolverTypeWrapper<_ValidatorArgument>
	_PathArgument: ResolverTypeWrapper<_PathArgument>
	_LiteralArgument: ResolverTypeWrapper<
		Omit<_LiteralArgument, 'value'> & { value?: Maybe<ResolversTypes['_AnyValue']> }
	>
	_AnyValue:
		| ResolversTypes['_IntValue']
		| ResolversTypes['_StringValue']
		| ResolversTypes['_BooleanValue']
		| ResolversTypes['_FloatValue']
		| ResolversTypes['_UndefinedValue']
	_IntValue: ResolverTypeWrapper<_IntValue>
	_StringValue: ResolverTypeWrapper<_StringValue>
	_BooleanValue: ResolverTypeWrapper<_BooleanValue>
	Boolean: ResolverTypeWrapper<Scalars['Boolean']>
	_FloatValue: ResolverTypeWrapper<_FloatValue>
	Float: ResolverTypeWrapper<Scalars['Float']>
	_UndefinedValue: ResolverTypeWrapper<_UndefinedValue>
}

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
	Query: {}
	_Schema: _Schema
	_Enum: _Enum
	String: Scalars['String']
	_Entity: _Entity
	_Field: _Field
	_Rule: _Rule
	_RuleMessage: _RuleMessage
	Int: Scalars['Int']
	_Validator: Omit<_Validator, 'arguments'> & { arguments: Array<ResolversTypes['_Argument']> }
	_Argument: ResolversTypes['_ValidatorArgument'] | ResolversTypes['_PathArgument'] | ResolversTypes['_LiteralArgument']
	_ValidatorArgument: _ValidatorArgument
	_PathArgument: _PathArgument
	_LiteralArgument: Omit<_LiteralArgument, 'value'> & { value?: Maybe<ResolversTypes['_AnyValue']> }
	_AnyValue:
		| ResolversTypes['_IntValue']
		| ResolversTypes['_StringValue']
		| ResolversTypes['_BooleanValue']
		| ResolversTypes['_FloatValue']
		| ResolversTypes['_UndefinedValue']
	_IntValue: _IntValue
	_StringValue: _StringValue
	_BooleanValue: _BooleanValue
	Boolean: Scalars['Boolean']
	_FloatValue: _FloatValue
	Float: Scalars['Float']
	_UndefinedValue: _UndefinedValue
}

export type _AnyValueResolvers<
	ContextType = any,
	ParentType extends ResolversParentTypes['_AnyValue'] = ResolversParentTypes['_AnyValue']
> = {
	__resolveType: TypeResolveFn<
		'_IntValue' | '_StringValue' | '_BooleanValue' | '_FloatValue' | '_UndefinedValue',
		ParentType,
		ContextType
	>
}

export type _ArgumentResolvers<
	ContextType = any,
	ParentType extends ResolversParentTypes['_Argument'] = ResolversParentTypes['_Argument']
> = {
	__resolveType: TypeResolveFn<'_ValidatorArgument' | '_PathArgument' | '_LiteralArgument', ParentType, ContextType>
}

export type _BooleanValueResolvers<
	ContextType = any,
	ParentType extends ResolversParentTypes['_BooleanValue'] = ResolversParentTypes['_BooleanValue']
> = {
	booleanValue?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>
}

export type _EntityResolvers<
	ContextType = any,
	ParentType extends ResolversParentTypes['_Entity'] = ResolversParentTypes['_Entity']
> = {
	name?: Resolver<ResolversTypes['String'], ParentType, ContextType>
	fields?: Resolver<ReadonlyArray<ResolversTypes['_Field']>, ParentType, ContextType>
}

export type _EnumResolvers<
	ContextType = any,
	ParentType extends ResolversParentTypes['_Enum'] = ResolversParentTypes['_Enum']
> = {
	name?: Resolver<ResolversTypes['String'], ParentType, ContextType>
	values?: Resolver<ReadonlyArray<ResolversTypes['String']>, ParentType, ContextType>
}

export type _FieldResolvers<
	ContextType = any,
	ParentType extends ResolversParentTypes['_Field'] = ResolversParentTypes['_Field']
> = {
	name?: Resolver<ResolversTypes['String'], ParentType, ContextType>
	rules?: Resolver<ReadonlyArray<ResolversTypes['_Rule']>, ParentType, ContextType>
	validators?: Resolver<ReadonlyArray<ResolversTypes['_Validator']>, ParentType, ContextType>
}

export type _FloatValueResolvers<
	ContextType = any,
	ParentType extends ResolversParentTypes['_FloatValue'] = ResolversParentTypes['_FloatValue']
> = {
	floatValue?: Resolver<ResolversTypes['Float'], ParentType, ContextType>
}

export type _IntValueResolvers<
	ContextType = any,
	ParentType extends ResolversParentTypes['_IntValue'] = ResolversParentTypes['_IntValue']
> = {
	intValue?: Resolver<ResolversTypes['Int'], ParentType, ContextType>
}

export type _LiteralArgumentResolvers<
	ContextType = any,
	ParentType extends ResolversParentTypes['_LiteralArgument'] = ResolversParentTypes['_LiteralArgument']
> = {
	value?: Resolver<Maybe<ResolversTypes['_AnyValue']>, ParentType, ContextType>
}

export type _PathArgumentResolvers<
	ContextType = any,
	ParentType extends ResolversParentTypes['_PathArgument'] = ResolversParentTypes['_PathArgument']
> = {
	path?: Resolver<ReadonlyArray<ResolversTypes['String']>, ParentType, ContextType>
}

export type _RuleResolvers<
	ContextType = any,
	ParentType extends ResolversParentTypes['_Rule'] = ResolversParentTypes['_Rule']
> = {
	message?: Resolver<Maybe<ResolversTypes['_RuleMessage']>, ParentType, ContextType>
	validator?: Resolver<ResolversTypes['Int'], ParentType, ContextType>
}

export type _RuleMessageResolvers<
	ContextType = any,
	ParentType extends ResolversParentTypes['_RuleMessage'] = ResolversParentTypes['_RuleMessage']
> = {
	text?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>
}

export type _SchemaResolvers<
	ContextType = any,
	ParentType extends ResolversParentTypes['_Schema'] = ResolversParentTypes['_Schema']
> = {
	enums?: Resolver<ReadonlyArray<ResolversTypes['_Enum']>, ParentType, ContextType>
	entities?: Resolver<ReadonlyArray<ResolversTypes['_Entity']>, ParentType, ContextType>
}

export type _StringValueResolvers<
	ContextType = any,
	ParentType extends ResolversParentTypes['_StringValue'] = ResolversParentTypes['_StringValue']
> = {
	stringValue?: Resolver<ResolversTypes['String'], ParentType, ContextType>
}

export type _UndefinedValueResolvers<
	ContextType = any,
	ParentType extends ResolversParentTypes['_UndefinedValue'] = ResolversParentTypes['_UndefinedValue']
> = {
	undefinedValue?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>
}

export type _ValidatorResolvers<
	ContextType = any,
	ParentType extends ResolversParentTypes['_Validator'] = ResolversParentTypes['_Validator']
> = {
	operation?: Resolver<ResolversTypes['String'], ParentType, ContextType>
	arguments?: Resolver<ReadonlyArray<ResolversTypes['_Argument']>, ParentType, ContextType>
}

export type _ValidatorArgumentResolvers<
	ContextType = any,
	ParentType extends ResolversParentTypes['_ValidatorArgument'] = ResolversParentTypes['_ValidatorArgument']
> = {
	validator?: Resolver<ResolversTypes['Int'], ParentType, ContextType>
}

export type QueryResolvers<
	ContextType = any,
	ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']
> = {
	schema?: Resolver<Maybe<ResolversTypes['_Schema']>, ParentType, ContextType>
}

export type Resolvers<ContextType = any> = {
	_AnyValue?: _AnyValueResolvers
	_Argument?: _ArgumentResolvers
	_BooleanValue?: _BooleanValueResolvers<ContextType>
	_Entity?: _EntityResolvers<ContextType>
	_Enum?: _EnumResolvers<ContextType>
	_Field?: _FieldResolvers<ContextType>
	_FloatValue?: _FloatValueResolvers<ContextType>
	_IntValue?: _IntValueResolvers<ContextType>
	_LiteralArgument?: _LiteralArgumentResolvers<ContextType>
	_PathArgument?: _PathArgumentResolvers<ContextType>
	_Rule?: _RuleResolvers<ContextType>
	_RuleMessage?: _RuleMessageResolvers<ContextType>
	_Schema?: _SchemaResolvers<ContextType>
	_StringValue?: _StringValueResolvers<ContextType>
	_UndefinedValue?: _UndefinedValueResolvers<ContextType>
	_Validator?: _ValidatorResolvers<ContextType>
	_ValidatorArgument?: _ValidatorArgumentResolvers<ContextType>
	Query?: QueryResolvers<ContextType>
}

/**
 * @deprecated
 * Use "Resolvers" root object instead. If you wish to get "IResolvers", add "typesPrefix: I" to your config.
 */
export type IResolvers<ContextType = any> = Resolvers<ContextType>
