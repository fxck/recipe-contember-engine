import { MasterContainerFactory, MasterContainerArgs } from './MasterContainer.js'
import { ProjectConfig } from '@contember/engine-http'
import { readConfig } from './config/config.js'
import { ProcessType } from './utils/index.js'

export { MasterContainerFactory, ProjectConfig, readConfig, ProcessType }

export const createContainer = (args: MasterContainerArgs) => {
	return new MasterContainerFactory().create(args)
}
