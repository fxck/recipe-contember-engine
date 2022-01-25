import esbuild from 'esbuild'
import { resolvePlugin } from '../../scripts/esbuild/esbuild.js'

esbuild.build({
	entryPoints: ['./packages/cli/src/run.ts'],
	bundle: true,
	platform: 'node',
	sourcemap: 'external',
	outfile: './dist/run.cjs',
	plugins: [resolvePlugin],
	external: ['pg-native', 'electron', 'typescript'],
}).catch(e => {
	console.error(e)
	process.exit(1)
})
