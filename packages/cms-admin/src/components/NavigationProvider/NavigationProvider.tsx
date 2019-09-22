import * as React from 'react'
import { shallowEqual, useSelector } from 'react-redux'
import { PageLink } from '../pageRouting'
import { DynamicLink } from '../DynamicLink'
import { Navigation } from '@contember/ui'
import State from '../../state'
import { requestStateToPath } from '../../utils/url'
import routes from '../../routes'
import { PageRequest, pageRequest } from '../../state/request'
import { isUrlActive } from '../../utils/isUrlActive'

export interface NavigationIsActiveProviderProps {
	children?: React.ReactNode
}

export const NavigationIsActiveProvider = React.memo((props: NavigationIsActiveProviderProps) => {
	const viewRoute = useSelector((state: State): PageRequest<any> | undefined => {
		if (!state.view.route || state.view.route.name !== 'project_page') {
			return undefined
		}
		return state.view.route
	}, shallowEqual)
	const configs = useSelector((state: State) => state.projectsConfigs.configs, shallowEqual)
	const request = useSelector((state: State) => state.request, shallowEqual)
	const isActive = React.useCallback(
		(to: string | Navigation.CustomTo) => {
			if (viewRoute === undefined) {
				return false
			}
			const url = requestStateToPath(
				routes(configs),
				pageRequest(
					viewRoute.project,
					viewRoute.stage,
					typeof to === 'string' ? to : to.pageName,
					typeof to === 'string' ? {} : to.parameters,
				)(request),
			)
			return isUrlActive(url)
		},
		[configs, request, viewRoute],
	)

	return <Navigation.IsActiveContext.Provider value={isActive}>{props.children}</Navigation.IsActiveContext.Provider>
})
NavigationIsActiveProvider.displayName = 'NavigationIsActiveProvider'

export interface NavigationProviderProps {
	children?: React.ReactNode
}

export const NavigationProvider = React.memo((props: NavigationProviderProps) => {
	return (
		<NavigationIsActiveProvider>
			<Navigation.MiddlewareContext.Provider
				value={({ to, children, ...props }: Navigation.MiddlewareProps) => {
					if ('Component' in props) {
						const Component = props.Component
						return (
							<DynamicLink
								requestChange={requestState => {
									if (typeof to === 'string') {
										return { ...requestState, pageName: to }
									}
									return { ...requestState, ...to }
								}}
								Component={innerProps => (
									<Component navigate={() => innerProps.onClick()} isActive={innerProps.isActive}>
										{innerProps.children}
									</Component>
								)}
							>
								<>{children}</>
							</DynamicLink>
						)
					}
					return (
						<PageLink
							to={
								typeof to === 'string'
									? to
									: () => ({
											name: to.pageName,
											params: to.parameters,
									  })
							}
							{...props}
						>
							{children}
						</PageLink>
					)
				}}
			>
				{props.children}
			</Navigation.MiddlewareContext.Provider>
		</NavigationIsActiveProvider>
	)
})
NavigationProvider.displayName = 'NavigationProvider'
