type Variables = { [name: string]: any }
type Headers = { [name: string]: string }

class GraphqlClient {
	constructor(private readonly apiUrl: string) {}

	async request<T = any>(query: string, variables: Variables, apiToken?: string): Promise<T> {
		const headers: Headers = {
			'Content-Type': 'application/json'
		}

		if (apiToken) {
			headers['Authorization'] = `Bearer ${apiToken}`
		}

		const response = await fetch(this.apiUrl, {
			method: 'POST',
			headers,
			body: JSON.stringify({ query, variables })
		})
		if (response.ok) {
			const result = await response.json()
			if (response.ok && !result.errors && result.data) {
				return result.data
			} else {
				const body = await response.text()
				throw new GraphqlClient.GraphqlClientError({ query, variables }, { status: response.status, body, data: result })
			}
		} else {
			const body = await response.text()
			let data : any = undefined
			try {
				data = JSON.parse(body)
			} catch {
				//invalid JSON
			}
			const request = { query, variables }
			const errorResponse = { status: response.status, body, data }
			if (
				data &&
				data.errors &&
				data.errors[0] &&
				data.errors[0].code === 401
			) {
				throw new GraphqlClient.GraphqlAuthenticationError(request, errorResponse)
			}

			throw new GraphqlClient.GraphqlServerError(request, errorResponse)
		}
	}
}

namespace GraphqlClient {
	type Request = { query: string, variables: Variables }
	type Response = { status: number, body: string, data?: any }

	export class GraphqlError extends Error {
		request: Request
		response: Response
		constructor(request: Request, response: Response) {
			let message = 'An GraphQL error occured'
			if (
				response.data &&
				Array.isArray(response.data.errors) &&
				response.data.errors[0] &&
				response.data.errors[0].message
			) {
				message = response.data.errors[0].message
			} else if (response.status) {
				message = `API responded with ${response.status} status code`
			}
			super(`${message}: ${JSON.stringify({ request, response })}`)
			this.request = request
			this.response = response
		}
	}

	export class GraphqlServerError extends GraphqlError {}
	export class GraphqlClientError extends GraphqlError {}
	export class GraphqlAuthenticationError extends GraphqlError {}
}

export default GraphqlClient
