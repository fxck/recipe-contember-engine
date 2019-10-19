import { Button, ErrorList, FormGroup, TextInput } from '@contember/ui'
import * as React from 'react'
import { useDispatch } from 'react-redux'
import { createAction } from 'redux-actions'
import { ApiRequestReadyState, getTenantErrorMessage } from '../../apiClient'
import { SET_IDENTITY } from '../../reducer/auth'
import { AuthIdentity, Project } from '../../state/auth'
import { MiscPageLayout } from '../MiscPageLayout'
import { useRedirect } from '../pageRouting'
import { useLoginRequest } from './useLoginRequest'

export const Login = React.memo(() => {
	const [requestState, login] = useLoginRequest()
	const [email, setEmail] = React.useState('')
	const [password, setPassword] = React.useState('')

	const isLoading = requestState.readyState === ApiRequestReadyState.Pending

	const onSubmit = React.useCallback(
		(e: React.FormEvent<HTMLFormElement>) => {
			e.preventDefault()
			login(email, password)
		},
		[email, login, password],
	)
	const onEmailChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value), [])
	const onPasswordChange = React.useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value),
		[],
	)

	const errorMessages = React.useMemo(() => {
		let errors: string[] = []

		if (requestState.readyState === ApiRequestReadyState.Error) {
			errors.push('Something went wrong. Please try again.')
		} else if (requestState.readyState === ApiRequestReadyState.Success) {
			errors = errors.concat(
				requestState.data.signIn.errors.map(
					(error: { endUserMessage: string | null; code: string }) =>
						error.endUserMessage || getTenantErrorMessage(error.code),
				),
			)
		}
		return errors.map(message => ({ message }))
	}, [requestState])

	const dispatch = useDispatch()
	const redirect = useRedirect()
	React.useEffect(() => {
		if (requestState.readyState === ApiRequestReadyState.Success) {
			const signIn = requestState.data.signIn

			if (!signIn.ok) {
				return
			}

			dispatch(
				createAction<AuthIdentity>(SET_IDENTITY, () => ({
					token: signIn.result.token,
					email: signIn.result.person.email,
					personId: signIn.result.person.id,
					projects: signIn.result.person.identity.projects.map(
						(it: any): Project => ({
							slug: it.project.slug,
							roles: it.memberships.map((membership: { role: string }) => membership.role),
						}),
					),
				}))(),
			)
			redirect(() => ({ name: 'projects_list' }))
		}
	}, [dispatch, redirect, requestState])

	return (
		<MiscPageLayout heading="Contember Admin">
			<form onSubmit={onSubmit}>
				<ErrorList size="large" errors={errorMessages} />
				<FormGroup label="Email">
					<TextInput value={email} autoComplete="username" type="email" disabled={isLoading} onChange={onEmailChange} />
				</FormGroup>
				<FormGroup label="Password">
					<TextInput
						type="password"
						autoComplete="current-password"
						value={password}
						disabled={isLoading}
						onChange={onPasswordChange}
					/>
				</FormGroup>
				<FormGroup label={undefined}>
					<Button type="submit" intent="primary" disabled={isLoading}>
						Submit
					</Button>
				</FormGroup>
			</form>
		</MiscPageLayout>
	)
})
Login.displayName = 'Login'
