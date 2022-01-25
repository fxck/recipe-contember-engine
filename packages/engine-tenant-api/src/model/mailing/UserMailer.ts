import { Mailer, TemplateRenderer } from '../../utils/index.js'
import NewUserInvited from './templates/NewUserInvited.mustache.js'
import ExistingUserInvited from './templates/ExistingUserInvited.mustache.js'
import PasswordReset from './templates/PasswordReset.mustache.js'
import { MailTemplateData, MailTemplateIdentifier, MailType } from './type.js'
import { MailTemplateQuery } from '../queries/index.js'
import Layout from './templates/Layout.mustache.js'
import { DatabaseContext } from '../utils/index.js'

export class UserMailer {
	constructor(
		private readonly mailer: Mailer,
		private readonly templateRenderer: TemplateRenderer,
	) {}

	async sendNewUserInvitedMail(
		dbContext: DatabaseContext,
		mailArguments: { email: string; password: string | null; token: string | null; project: string },
		customMailOptions: { projectId: string; variant: string },
	): Promise<void> {
		const template = (await this.getCustomTemplate(dbContext, { type: MailType.newUserInvited, ...customMailOptions })) || {
			subject: 'You have been invited to {{project}}',
			content: NewUserInvited,
		}
		await this.sendTemplate(template, mailArguments)
	}

	async sendExistingUserInvitedEmail(
		dbContext: DatabaseContext,
		mailArguments: { email: string; project: string },
		customMailOptions: { projectId: string; variant: string },
	): Promise<void> {
		const template = (await this.getCustomTemplate(dbContext, { type: MailType.existingUserInvited, ...customMailOptions })) || {
			subject: 'You have been invited to {{project}}',
			content: ExistingUserInvited,
		}
		await this.sendTemplate(template, mailArguments)
	}

	async sendPasswordResetEmail(
		dbContext: DatabaseContext,
		mailArguments: { email: string; token: string; project?: string },
		customMailOptions: { projectId?: string; variant: string },
	): Promise<void> {
		const template = (await this.getCustomTemplate(dbContext, { type: MailType.passwordReset, ...customMailOptions })) || {
			subject: 'Password reset',
			content: PasswordReset,
		}
		await this.sendTemplate(template, mailArguments)
	}

	private async sendTemplate(
		template: Pick<MailTemplateData, 'subject' | 'content'>,
		mailArguments: Record<string, any>,
	) {
		const html = await this.templateRenderer.render(template.content, mailArguments)
		await this.mailer.send({
			to: mailArguments.email,
			subject: await this.templateRenderer.render(template.subject, mailArguments),
			html,
		})
	}

	private async getCustomTemplate(
		dbContext: DatabaseContext,
		identifier: MailTemplateIdentifier,
	): Promise<Pick<MailTemplateData, 'subject' | 'content'> | null> {
		const customTemplate =
			(await dbContext.queryHandler.fetch(new MailTemplateQuery(identifier)))
			?? (await dbContext.queryHandler.fetch(new MailTemplateQuery({ ...identifier, projectId: undefined })))

		if (!customTemplate) {
			return null
		}
		const content = customTemplate.useLayout ? Layout(customTemplate.content) : customTemplate.content
		return { content, subject: customTemplate.subject }
	}
}
