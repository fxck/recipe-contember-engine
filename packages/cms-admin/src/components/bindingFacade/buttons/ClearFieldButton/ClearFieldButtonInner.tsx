import { Button, ButtonProps, Icon } from '@contember/ui'
import * as React from 'react'
import { FieldAccessor } from '../../../../binding'

export type ClearFieldButtonInnerPublicProps = ButtonProps

export interface ClearFieldButtonInnerInternalProps {
	field: FieldAccessor
	isMutating: boolean
}

export type ClearFieldButtonInnerProps = ClearFieldButtonInnerPublicProps & ClearFieldButtonInnerInternalProps

export const ClearFieldButtonInner = (props: ClearFieldButtonInnerProps) => {
	const { field, isMutating, ...buttonProps } = props
	const onClick = React.useCallback(() => {
		if (!field.updateValue) {
			return
		}
		field.updateValue(null)
	}, [field])

	return (
		<Button
			onClick={onClick}
			disabled={isMutating}
			size="small"
			flow="squarish"
			distinction="seamless"
			{...buttonProps}
		>
			<Icon blueprintIcon="cross" />
		</Button>
	)
}