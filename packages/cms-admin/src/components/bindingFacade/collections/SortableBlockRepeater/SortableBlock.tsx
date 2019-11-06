import { Box } from '@contember/ui'
import * as React from 'react'
import { DataBindingError, EntityAccessor, Field, FieldAccessor, RelativeSingleField } from '../../../../binding'
import { NormalizedBlockProps } from '../../blocks'

export interface SortableBlockProps {
	discriminationField: RelativeSingleField
	normalizedBlockProps: NormalizedBlockProps[]
}

export const SortableBlock = React.memo<SortableBlockProps>(props => (
	<Field.DataRetriever name={props.discriminationField}>
		{rawMetadata => {
			const data = rawMetadata.data

			if (!(data instanceof EntityAccessor)) {
				throw new DataBindingError(`Corrupt data`)
			}
			const field = data.data.getField(props.discriminationField)

			if (!(field instanceof FieldAccessor)) {
				throw new DataBindingError(`Corrupt data`)
			}

			const selectedBlock = props.normalizedBlockProps.find(block => field.hasValue(block.discriminateBy))

			if (!selectedBlock) {
				return null
			}

			return (
				<Box heading={selectedBlock.label} distinction="seamlessIfNested">
					{selectedBlock.children}
				</Box>
			)
		}}
	</Field.DataRetriever>
))
SortableBlock.displayName = 'SortableBlock'