import Command from './Command'
import { AddProjectMemberErrorCode } from '../../schema/types'
import KnexWrapper from '../../../core/knex/KnexWrapper'
import { uuid } from '../../../utils/uuid'

class AddProjectMemberCommand implements Command<AddProjectMemberCommand.AddProjectMemberResponse> {
	constructor(
		private readonly projectId: string,
		private readonly identityId: string,
		private readonly roles: string[]
	) {}

	async execute(db: KnexWrapper): Promise<AddProjectMemberCommand.AddProjectMemberResponse> {
		try {
			await db
				.insertBuilder()
				.into('project_member')
				.values({
					id: uuid(),
					project_id: this.projectId,
					identity_id: this.identityId,
					roles: JSON.stringify(this.roles),
				})
				.execute()

			return new AddProjectMemberCommand.AddProjectMemberResponseOk()
		} catch (e) {
			switch (e.constraint) {
				case 'project_member_project_id_fkey':
					return new AddProjectMemberCommand.AddProjectMemberResponseError([
						AddProjectMemberErrorCode.PROJECT_NOT_FOUND,
					])

				case 'project_member_identity':
					return new AddProjectMemberCommand.AddProjectMemberResponseError([
						AddProjectMemberErrorCode.IDENTITY_NOT_FOUND,
					])

				case 'project_member_project_identity':
					return new AddProjectMemberCommand.AddProjectMemberResponseError([AddProjectMemberErrorCode.ALREADY_MEMBER])

				default:
					throw e
			}
		}
	}
}

namespace AddProjectMemberCommand {
	export type AddProjectMemberResponse = AddProjectMemberResponseOk | AddProjectMemberResponseError

	export class AddProjectMemberResponseOk {
		readonly ok = true

		constructor() {}
	}

	export class AddProjectMemberResponseError {
		readonly ok = false

		constructor(public readonly errors: Array<AddProjectMemberErrorCode>) {}
	}
}

export default AddProjectMemberCommand