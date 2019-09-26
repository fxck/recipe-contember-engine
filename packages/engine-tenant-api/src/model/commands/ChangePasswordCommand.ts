import { Command } from './Command'

class ChangePasswordCommand implements Command<void> {
	constructor(private readonly personId: string, private readonly password: string) {}

	async execute({ db, providers }: Command.Args): Promise<void> {
		await db
			.updateBuilder()
			.table('person')
			.values({
				password_hash: await providers.bcrypt(this.password),
			})
			.where({
				id: this.personId,
			})
			.execute()
	}
}

export { ChangePasswordCommand }
