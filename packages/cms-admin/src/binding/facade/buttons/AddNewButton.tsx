import { Button, Intent } from '@blueprintjs/core'
import * as React from 'react'
import { EntityCollectionAccessor } from '../../dao'

interface AddNewButtonProps {
	addNew: EntityCollectionAccessor['addNew']
}

export class AddNewButton extends React.PureComponent<AddNewButtonProps> {
	public render() {
		return (
			this.props.addNew && (
				<Button icon="plus" onClick={this.props.addNew} intent={Intent.PRIMARY}>
					Add new
				</Button>
			)
		)
	}
}
