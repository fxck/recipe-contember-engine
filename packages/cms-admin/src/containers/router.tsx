import * as React from 'react'
import { connect } from 'react-redux'
import State from '../state'
import RequestState from '../state/request'

type RouteName = RequestState['name']
type RequestByName<K extends RouteName, T = RequestState> = T extends { name: K } ? T : never
type RouteHandler<K extends RouteName> = React.FunctionComponent<{ route: RequestByName<K> }>
type RouteMap<N extends RouteName = RouteName> = { [K in N]: RouteHandler<K> }

interface RoutesRendererStateProps {
	loading: boolean
	route: RequestState | null
}

interface RoutesRendererOwnProps {
	routes: RouteMap
}

type RoutesRendererProps = RoutesRendererStateProps & RoutesRendererOwnProps

class RoutesRenderer extends React.PureComponent<RoutesRendererProps> {
	public render() {
		const route = this.props.route
		if (!route) {
			return null
		}
		const Handler = this.props.routes[route.name] as RouteHandler<RouteName>
		return Handler ? <Handler route={route} /> : '404'
	}
}

export const Router = connect<RoutesRendererStateProps, {}, RoutesRendererOwnProps, State>(
	({ view: { loading, route } }) => ({
		loading,
		route,
	}),
)(RoutesRenderer)
