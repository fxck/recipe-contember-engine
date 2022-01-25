import esbuild from 'esbuild'
import { resolvePlugin } from '../../scripts/esbuild/esbuild.js'

esbuild.build({
	entryPoints: ['./packages/engine-server/src/start.ts'],
	bundle: true,
	platform: 'node',
	sourcemap: 'external',
	outfile: './server/server.cjs',
	plugins: [resolvePlugin],
	external: ['pg-native', 'mock-aws-s3', 'aws-sdk', 'nock', 'bcrypt'],
}).catch(e => {
	console.error(e)
	process.exit(1)
})
