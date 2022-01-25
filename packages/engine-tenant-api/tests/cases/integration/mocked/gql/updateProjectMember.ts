import { GraphQLTestQuery } from './types.js'
import { GQL } from '../../../../src/tags.js'
import { MembershipInput } from '../../../../../src/schema/index.js'

export const updateProjectMemberMutation = (variables: {
	projectSlug: string
	identityId: string
	memberships: MembershipInput[]
}): GraphQLTestQuery => ({
	query: GQL`mutation($identityId: String! $projectSlug: String!, $memberships: [MembershipInput!]!) {
		updateProjectMember(
			projectSlug: $projectSlug,
			identityId: $identityId,
			memberships: $memberships
		) {
			ok
			errors {
				code
			}
		}
	}`,
	variables,
})
