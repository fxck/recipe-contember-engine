import { PageLinkById, SortableRepeater, TextField } from 'cms-admin'
import * as React from 'react'
import { LocaleSideDimension } from '../components'

export const whatWeDoListForm = (
	<LocaleSideDimension>
		<SortableRepeater sortBy="order" field="$locale.whatWeDo" removeType="delete">
			<TextField name="activity" label="Activity" />
			<PageLinkById change={id => ({ name: 'edit_whatWeDo', params: { id } })}>Edit details</PageLinkById>
		</SortableRepeater>
	</LocaleSideDimension>
)
