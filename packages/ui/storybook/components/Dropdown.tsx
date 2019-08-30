import { storiesOf } from '@storybook/react'
import * as React from 'react'
import { Dropdown, DropdownProps } from '../../src'
import { radios } from '@storybook/addon-knobs'

const Component = () => {
	const alignment: DropdownProps['alignment'] = radios('Alignment', {
		Default: 'default',
		Center: 'center',
		Start: 'start',
		End: 'end',
	})

	return (
		<Dropdown
			buttonProps={{
				children: 'Toggle',
			}}
			alignment={alignment}
		>
			<>Dropdown content goes here</>
		</Dropdown>
	)
}

storiesOf('Dropdown', module).add('simple', () => {
	return (
		<div style={{ display: 'flex', justifyContent: 'center' }}>
			<Component />
		</div>
	)
})
