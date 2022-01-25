import { Project } from '@contember/cli-common'
import { Schema } from '@contember/schema'
import { join } from 'path'

export const loadSchema = async (project: Project): Promise<Schema> => {
	return (await import(join(project.apiDir, 'index.ts'))).default
}
