import { Command } from '../Command.js'
import { PersonRow } from '../../queries/index.js'
import { InsertBuilder } from '@contember/database'

export class CreatePersonCommand implements Command<Omit<PersonRow, 'roles'>> {
	constructor(private readonly identityId: string, private readonly email: string, private readonly password: string | null) {}

	async execute({ db, providers }: Command.Args): Promise<Omit<PersonRow, 'roles'>> {
		const id = providers.uuid()

		const password_hash = this.password ? await providers.bcrypt(this.password) : null
		await InsertBuilder.create()
			.into('person')
			.values({
				id: id,
				email: this.email,
				password_hash,
				identity_id: this.identityId,
			})
			.execute(db)

		return { id, email: this.email, password_hash, identity_id: this.identityId, otp_uri: null, otp_activated_at: null }
	}
}
