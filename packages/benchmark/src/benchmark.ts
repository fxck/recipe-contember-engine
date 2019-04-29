import { mkdir, readFile, writeFile } from 'fs'
import { promisify } from 'util'
import { join } from 'path'
// @ts-ignore-line
import autocannon from 'autocannon'
import { createHttpOptions, graphqlRequest } from './http'

const fileRead = promisify(readFile)
const dirCreate = promisify(mkdir)
const fileWrite = promisify(writeFile)

const sleep = (delay: number) => new Promise(resolve => setTimeout(resolve, delay))
;(async () => {
	const testName = process.argv[2]
	if (testName) {
		await dirCreate(join(__dirname, '/../../results/', testName))
	}

	const serverPort = process.env.SERVER_PORT
	const contentEndpoint = `http://localhost:${serverPort}/content/app/prod`
	const accessToken = process.env.ACCESS_TOKEN!

	const queryGql = await fileRead(join(__dirname, '/../../src/query.graphql'), { encoding: 'utf8' })

	const queryResponse = await graphqlRequest({
		endpoint: contentEndpoint,
		query: queryGql,
		authorizationToken: accessToken
	})
	console.log('Query count: ' + queryResponse.extensions.dbQueries.length)

	console.log('Warmup')
	for (let i = 0; i < 300; i++) {
		await Promise.all(
			[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(() =>
				graphqlRequest({
					endpoint: contentEndpoint,
					query: queryGql,
					authorizationToken: accessToken
				})
			)
		)
	}
	console.log('Warmup done')
	await sleep(1000)

	const run = (connections: number) => {
		console.log('\n\n\nBenchmarking with concurrency ' + connections)
		const instance = autocannon({
			connections,
			duration: 20,
			...createHttpOptions({
				endpoint: contentEndpoint,
				query: queryGql,
				authorizationToken: accessToken
			})
		})

		autocannon.track(instance, { renderProgressBar: false })
		instance.on('done', async (result: any) => {
			if (testName) {
				const filename = join(
					__dirname,
					'/../../results/',
					testName,
					'test' + String(connections).padStart(2, '0') + '.json'
				)
				await fileWrite(filename, JSON.stringify(result), { encoding: 'utf8' })
			}

			if (connections <= 8) {
				await sleep(1000)
				run(connections * 2)
			}
		})
	}

	run(1)
})().catch(e => {
	console.error(e)
	process.exit(1)
})
