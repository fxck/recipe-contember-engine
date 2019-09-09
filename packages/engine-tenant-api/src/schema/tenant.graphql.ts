import { gql } from 'apollo-server-core'
import { DocumentNode } from 'graphql'

const schema: DocumentNode = gql`
	schema {
		query: Query
		mutation: Mutation
	}

	type Query {
		me: Identity!
		projects: [Project!]!
		projectBySlug(slug: String!): Project
	}

	type Mutation {
		setup(superadmin: AdminCredentials!): SetupResponse

		signUp(email: String!, password: String!): SignUpResponse
		signIn(email: String!, password: String!, expiration: Int): SignInResponse
		signOut(all: Boolean): SignOutResponse
		changePassword(personId: String!, password: String!): ChangePasswordResponse

		invite(email: String!, projectSlug: String!, memberships: [MembershipInput!]!): InviteResponse

		addProjectMember(
			projectSlug: String!
			identityId: String!
			memberships: [MembershipInput!]!
		): AddProjectMemberResponse
		removeProjectMember(projectSlug: String!, identityId: String!): RemoveProjectMemberResponse
		updateProjectMember(
			projectSlug: String!
			identityId: String!
			memberships: [MembershipInput!]!
		): UpdateProjectMemberResponse

		createApiKey(projectSlug: String!, memberships: [MembershipInput!]!): CreateApiKeyResponse
		disableApiKey(id: String!): DisableApiKeyResponse
	}

	# === setUp ===

	input AdminCredentials {
		email: String!
		password: String!
	}

	type SetupResponse {
		ok: Boolean!
		errors: [SetupErrorCode!]!
		result: SetupResult
	}

	type SetupError {
		code: SetupErrorCode!
		endPersonMessage: String
		developerMessage: String
	}

	enum SetupErrorCode {
		SETUP_ALREADY_DONE
	}

	type SetupResult {
		superadmin: Person!
		loginKey: ApiKeyWithToken!
	}

	# === signUp ===
	type SignUpResponse {
		ok: Boolean!
		errors: [SignUpError!]!
		result: SignUpResult
	}

	type SignUpError {
		code: SignUpErrorCode!
		endPersonMessage: String
		developerMessage: String
	}

	enum SignUpErrorCode {
		EMAIL_ALREADY_EXISTS
		TOO_WEAK
	}

	type SignUpResult {
		person: Person!
	}

	# === signIn ===
	type SignInResponse {
		ok: Boolean!
		errors: [SignInError!]!
		result: SignInResult
	}

	type SignInError {
		code: SignInErrorCode!
		endUserMessage: String
		developerMessage: String
	}

	enum SignInErrorCode {
		UNKNOWN_EMAIL
		INVALID_PASSWORD
	}

	type SignInResult {
		token: String!
		person: Person!
	}

	# === signOut ===

	type SignOutResponse {
		ok: Boolean!
		errors: [SignOutError!]!
	}

	type SignOutError {
		code: SignOutErrorCode!
		endUserMessage: String
		developerMessage: String
	}

	enum SignOutErrorCode {
		NOT_A_PERSON
	}

	# === changePassword ===

	type ChangePasswordResponse {
		ok: Boolean!
		errors: [ChangePasswordError!]!
	}

	type ChangePasswordError {
		code: ChangePasswordErrorCode!
		endUserMessage: String
		developerMessage: String
	}

	enum ChangePasswordErrorCode {
		PERSON_NOT_FOUND
		TOO_WEAK
	}
	# === invite ===

	type InviteResponse {
		ok: Boolean!
		errors: [InviteError!]!
		result: InviteResult
	}

	type InviteError {
		code: InviteErrorCode!
		endUserMessage: String
		developerMessage: String
	}

	enum InviteErrorCode {
		PROJECT_NOT_FOUND
		VARIABLE_NOT_FOUND
		ALREADY_MEMBER
	}

	union InviteResult = InviteExistingResult | InviteNewResult

	type InviteExistingResult {
		person: Person!
	}

	type InviteNewResult {
		generatedPassword: String!
		person: Person!
	}

	# === addProjectMember ===

	type AddProjectMemberResponse {
		ok: Boolean!
		errors: [AddProjectMemberError!]!
	}

	type AddProjectMemberError {
		code: AddProjectMemberErrorCode!
		endUserMessage: String
		developerMessage: String
	}

	enum AddProjectMemberErrorCode {
		PROJECT_NOT_FOUND
		IDENTITY_NOT_FOUND
		VARIABLE_NOT_FOUND
		ALREADY_MEMBER
	}

	# === updateProjectMember ===

	type UpdateProjectMemberResponse {
		ok: Boolean!
		errors: [UpdateProjectMemberError!]!
	}

	type UpdateProjectMemberError {
		code: UpdateProjectMemberErrorCode!
		endUserMessage: String
		developerMessage: String
	}

	enum UpdateProjectMemberErrorCode {
		PROJECT_NOT_FOUND
		VARIABLE_NOT_FOUND
		NOT_MEMBER
	}

	# === removeProjectMember ===

	type RemoveProjectMemberResponse {
		ok: Boolean!
		errors: [RemoveProjectMemberError!]!
	}

	type RemoveProjectMemberError {
		code: RemoveProjectMemberErrorCode!
		endUserMessage: String
		developerMessage: String
	}

	enum RemoveProjectMemberErrorCode {
		NOT_MEMBER
		PROJECT_NOT_FOUND
	}

	# === createApiKey ===

	type CreateApiKeyResponse {
		ok: Boolean!
		errors: [CreateApiKeyError!]!
		result: CreateApiKeyResult
	}

	type CreateApiKeyError {
		code: CreateApiKeyErrorCode!
		endUserMessage: String
		developerMessage: String
	}

	enum CreateApiKeyErrorCode {
		PROJECT_NOT_FOUND
		VARIABLE_NOT_FOUND
	}

	type CreateApiKeyResult {
		apiKey: ApiKeyWithToken!
	}

	# === disableApiKey ===

	type DisableApiKeyResponse {
		ok: Boolean!
		errors: [DisableApiKeyError!]!
	}

	type DisableApiKeyError {
		code: DisableApiKeyErrorCode!
		endUserMessage: String
		developerMessage: String
	}

	enum DisableApiKeyErrorCode {
		KEY_NOT_FOUND
	}

	# === common ===

	# === variables ===

	input VariableEntryInput {
		name: String!
		values: [String!]!
	}

	type VariableEntry {
		name: String!
		values: [String!]!
	}

	# === membership ===

	input MembershipInput {
		role: String!
		variables: [VariableEntryInput!]!
	}

	type Membership {
		role: String!
		variables: [VariableEntry!]!
	}

	# === person ====

	type Person {
		id: String!
		email: String!
		identity: Identity!
	}

	# === api key ===

	type ApiKey {
		id: String!
		identity: Identity!
	}

	type ApiKeyWithToken {
		id: String!
		token: String!
		identity: Identity!
	}

	# === identity ===

	type Identity {
		id: String!
		person: Person
		apiKey: ApiKey
		projects: [IdentityProjectRelation!]!
	}

	type IdentityProjectRelation {
		project: Project!
		memberships: [Membership!]!
	}

	# === project ===

	type Project {
		id: String!
		name: String!
		slug: String!
		roles: [RoleDefinition!]!
		members(memberType: MEMBER_TYPE): [ProjectIdentityRelation!]!
	}

	enum MEMBER_TYPE {
		API_KEY
		PERSON
	}

	type ProjectIdentityRelation {
		identity: Identity!
		memberships: [Membership!]!
	}

	type RoleDefinition {
		name: String!
		variables: [RoleVariableDefinition!]!
	}

	interface RoleVariableDefinition {
		name: String!
	}

	type RoleEntityVariableDefinition implements RoleVariableDefinition {
		name: String!
		entityName: String!
	}
`

export default schema
