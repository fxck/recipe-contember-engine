import * as React from 'react'
import slugify from '@sindresorhus/slugify'
import { FormGroup, InputGroup } from '../../../components/ui'
import { RelativeSingleField } from '../../bindingTypes'
import { Field, useEnvironment } from '../../coreComponents'
import { useMutationState } from '../../coreComponents/PersistState'
import { Environment } from '../../dao'
import { QueryLanguage } from '../../queryLanguage'
import { Component } from '../auxiliary'
import { useRelativeSingleField } from '../utils'

export interface SlugFieldProps {
	field: RelativeSingleField
	drivenBy: RelativeSingleField
	label?: React.ReactNode
	format?: (currentValue: string, environment: Environment) => string
}

export const SlugField = Component<SlugFieldProps>(
	props => <SlugFieldInner {...props} />,
	(props, environment) => (
		<>
			{QueryLanguage.wrapRelativeSingleField(
				props.field,
				fieldName => (
					<Field name={fieldName} />
				),
				environment,
			)}
			{QueryLanguage.wrapRelativeSingleField(
				props.drivenBy,
				fieldName => (
					<Field name={fieldName} />
				),
				environment,
			)}
			{props.label}
		</>
	),
	'Slug',
)

interface SlugFieldInnerProps extends SlugFieldProps {}

const SlugFieldInner = (props: SlugFieldInnerProps) => {
	const [hasEditedSlug, setHasEditedSlug] = React.useState(false)
	const slugField = useRelativeSingleField<string>(props.field)
	const driverField = useRelativeSingleField<string>(props.drivenBy)
	const environment = useEnvironment()
	const isMutating = useMutationState()

	// TODO maybe be smarter when the field is already persisted?
	let slugValue = slugField.currentValue || ''

	if (!hasEditedSlug) {
		slugValue = slugify(driverField.currentValue || '')

		if (props.format) {
			slugValue = props.format(slugValue, environment)
		}
	}

	return (
		<FormGroup
			label={props.label ? environment.applySystemMiddleware('labelMiddleware', props.label) : undefined}
			errors={slugField.errors}
		>
			<InputGroup
				value={slugValue}
				onChange={event => {
					hasEditedSlug || setHasEditedSlug(true)
					slugField.updateValue && slugField.updateValue(event.currentTarget.value)
				}}
				readOnly={isMutating}
			/>
		</FormGroup>
	)
}