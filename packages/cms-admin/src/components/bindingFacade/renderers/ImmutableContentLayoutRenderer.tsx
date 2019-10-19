import { IncreaseHeadingDepth, TitleBar, TitleBarProps } from '@contember/ui'
import * as React from 'react'
import {
	AccessorContext,
	AccessorTreeStateWithDataContext,
	Component,
	EntityAccessor,
	EntityForRemovalAccessor,
} from '../../../binding'
import { LayoutInner, LayoutSide } from '../../LayoutInner'
import { FeedbackRenderer, FeedbackRendererProps } from './FeedbackRenderer'

export interface ImmutableContentLayoutRendererProps extends ImmutableContentLayoutRendererInnerProps {}

export const ImmutableContentLayoutRenderer = Component<ImmutableContentLayoutRendererProps>(
	props => (
		<FeedbackRenderer>
			<ImmutableContentLayoutRendererInner {...props} />
		</FeedbackRenderer>
	),
	'ImmutableContentLayoutRenderer',
)

interface ImmutableContentLayoutRendererInnerProps extends FeedbackRendererProps, Omit<TitleBarProps, 'children'> {
	side?: React.ReactNode
	title?: React.ReactNode
}

const ImmutableContentLayoutRendererInner = Component<ImmutableContentLayoutRendererInnerProps>(
	({ side, children, title, navigation, actions, headingProps }) => {
		const accessorTreeState = React.useContext(AccessorTreeStateWithDataContext)
		const titleBar = React.useMemo(
			() =>
				title && (
					<TitleBar navigation={navigation} actions={actions} headingProps={headingProps}>
						{title}
					</TitleBar>
				),
			[actions, headingProps, navigation, title],
		)
		const content = React.useMemo(() => <IncreaseHeadingDepth currentDepth={1}>{children}</IncreaseHeadingDepth>, [
			children,
		])

		const treeStateRoot =
			accessorTreeState !== undefined
				? accessorTreeState.data.root instanceof EntityAccessor ||
				  accessorTreeState.data.root instanceof EntityForRemovalAccessor
					? accessorTreeState.data.root
					: undefined
				: undefined

		return (
			<>
				<LayoutInner>
					<AccessorContext.Provider value={treeStateRoot}>{titleBar}</AccessorContext.Provider>
					{content}
				</LayoutInner>
				{side && <LayoutSide>{side}</LayoutSide>}
			</>
		)
	},
	props => (
		<FeedbackRenderer>
			{props.title}
			{props.children}
			{props.side}
		</FeedbackRenderer>
	),
	'ImmutableContentLayoutRendererInner',
)
