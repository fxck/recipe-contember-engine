import { gql } from 'apollo-server-core'
import { DocumentNode } from 'graphql'

const schema: DocumentNode = gql`
	type Query {
		schema: _Schema
	}

	type _Schema {
		enums: [_Enum!]!
		entities: [_Entity!]!
	}

	type _Entity {
		name: String!
		fields: [_Field!]!
	}

	type _Field {
		name: String!
		rules: [_Rule!]!
		validators: [_Validator!]!
	}

	type _Rule {
		message: _RuleMessage
		validator: Int!
	}

	type _Validator {
		operation: String!
		arguments: [_Argument!]!
	}

	union _Argument = _ValidatorArgument | _PathArgument | _LiteralArgument

	type _ValidatorArgument {
		validator: Int!
	}

	type _PathArgument {
		path: [String!]!
	}

	type _LiteralArgument {
		value: _AnyValue
	}

	type _IntValue {
		intValue: Int!
	}

	type _StringValue {
		stringValue: String!
	}

	type _BooleanValue {
		booleanValue: Boolean!
	}

	type _FloatValue {
		floatValue: Float!
	}

	type _UndefinedValue {
		undefinedValue: Boolean!
	}

	union _AnyValue = _IntValue | _StringValue | _BooleanValue | _FloatValue | _UndefinedValue

	type _RuleMessage {
		text: String
	}

	type _Enum {
		name: String!
		values: [String!]!
	}
`

export default schema
