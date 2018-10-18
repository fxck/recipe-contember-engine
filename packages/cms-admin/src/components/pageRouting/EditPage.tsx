import * as React from 'react'
import { SingleEntityDataProvider } from '../../binding'
import { EntityName } from '../../binding/bindingTypes'
import { ParametersContext } from './Pages'
import PageWithLayout from './PageWithLayout'

interface EditPageProps {
	entity: EntityName
	layout?: React.ComponentType<{ children?: React.ReactNode }>
}

export default class EditPage extends React.Component<EditPageProps> {
	static getPageName(props: EditPageProps) {
		return `edit_${props.entity.toLowerCase()}`
	}

	render(): React.ReactNode {
		return (
			<PageWithLayout layout={this.props.layout}>
				<ParametersContext.Consumer>
					{({ id }: { id: string }) => (
						<SingleEntityDataProvider where={{ id }} name={this.props.entity}>
							{this.props.children}
						</SingleEntityDataProvider>
					)}
				</ParametersContext.Consumer>
			</PageWithLayout>
		)
	}
}