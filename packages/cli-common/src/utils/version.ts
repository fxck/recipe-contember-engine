import { join } from 'path'
import { packageRoot } from '../pathUtils.js'

export const getPackageVersion = async () => {
	return (await import(join(packageRoot, 'package.json'))).version
}
