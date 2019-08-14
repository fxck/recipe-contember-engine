import { Command } from './'
import { Client } from '@contember/database'
import bcrypt from 'bcrypt'
import { uuid } from '../..'
import { PersonRow } from '../queries'

class CreatePersonCommand implements Command<PersonRow> {
	constructor(private readonly identityId: string, private readonly email: string, private readonly password: string) {}

	async execute(db: Client): Promise<PersonRow> {
		const id = uuid()

		const password_hash = await bcrypt.hash(this.password, 10)
		await db
			.insertBuilder()
			.into('person')
			.values({
				id: id,
				email: this.email,
				password_hash,
				identity_id: this.identityId,
			})
			.execute()

		return { id, email: this.email, password_hash, identity_id: this.identityId }
	}
}

export { CreatePersonCommand }