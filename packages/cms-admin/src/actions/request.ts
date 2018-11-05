import { createAction } from 'redux-actions'
import { REQUEST_REPLACE } from '../reducer/request'
import routes, { PageNotFound } from '../routes'
import { default as RequestState, RequestChange } from '../state/request'
import { pathToRequestState, requestStateToPath } from '../utils/url'
import handleRequest from './requestHandler'
import { ActionCreator } from './types'

export const pushRequest = (requestChange: RequestChange): ActionCreator => (dispatch, getState) => {
	const previousRequest = getState().request
	const request: RequestState = { ...requestChange(previousRequest) }
	dispatch(createAction(REQUEST_REPLACE, () => request)())

	window.history.pushState({}, document.title, requestStateToPath(routes(getState().projectsConfigs.configs), request))
	dispatch(handleRequest(request, previousRequest))
}

export const populateRequest = (location: Location): ActionCreator => (dispatch, getState) => {
	const request = pathToRequestState(routes(getState().projectsConfigs.configs), location.pathname)

	if (!request) {
		throw new PageNotFound('No matching route found')
	}

	const previousRequest = getState().request
	dispatch(createAction(REQUEST_REPLACE, () => request)())
	dispatch(handleRequest(request, previousRequest))
}
