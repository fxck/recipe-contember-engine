import sample from './sample/index.js'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
export { sample as sampleProject }

export const getExampleProjectDirectory = () => join(dirname(fileURLToPath(import.meta.url)) + '/../../../src/projects')
