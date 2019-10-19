import { Reducer } from 'redux'
import { Action, handleActions } from 'redux-actions'
import AuthState, { AuthIdentity, AuthStatus, emptyAuthState } from '../state/auth'

export const SET_IDENTITY = 'set_identity'
export const SET_LOGOUT = 'set_logout'

export default handleActions<AuthState, any>(
	{
		[SET_IDENTITY]: (state: AuthState, action: Action<AuthIdentity>): AuthState => {
			return { ...state, errorMessage: null, status: AuthStatus.LOGGED_IN, identity: action.payload! }
		},
		[SET_LOGOUT]: (state: AuthState, action: Action<undefined>): AuthState => {
			return { ...state, errorMessage: null, identity: null, status: AuthStatus.NOT_LOGGED_IN }
		},
	},
	emptyAuthState,
) as Reducer
