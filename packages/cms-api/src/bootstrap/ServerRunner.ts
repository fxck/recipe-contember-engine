import { Config } from '../config/config'
import Koa from 'koa'
import { Server } from 'http'
import { success } from '../core/console/messages'

export class ServerRunner {
	constructor(private readonly koa: Koa, private readonly config: Config) {}

	public async run(): Promise<Server> {
		const port = this.config.server.port
		return this.koa.listen(Number.parseInt(String(port)), () => {
			console.log(success(`Tenant API running on http://localhost:${port}/tenant`))
			this.config.projects.forEach(project => {
				const url = `http://localhost:${port}/system/${project.slug}`
				console.log(success(`System API for project ${project.slug} running on ${url}`))
				project.stages.forEach(stage => {
					const url = `http://localhost:${port}/content/${project.slug}/${stage.slug}`
					console.log(success(`Content API for project ${project.slug} and stage ${stage.slug} running on ${url}`))
				})
			})
		})
	}
}
