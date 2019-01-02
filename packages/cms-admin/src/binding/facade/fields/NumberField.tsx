import { FormGroup, IFormGroupProps, IInputGroupProps, InputGroup } from '@blueprintjs/core'
import * as React from 'react'
import { ChangeEvent } from 'react'
import { FieldName } from '../../bindingTypes'
import { EnforceSubtypeRelation, Field, SyntheticChildrenProvider } from '../../coreComponents'
import { Environment, FieldAccessor } from '../../dao'
import { Parser } from '../../queryLanguage'

export interface NumberFieldProps {
	name: FieldName
	label?: IFormGroupProps['label']
	large?: IInputGroupProps['large']
	inlineLabel?: boolean
}

export class NumberField extends React.PureComponent<NumberFieldProps> {
	static displayName = 'TextField'

	public render() {
		return (
			<Field name={this.props.name}>
				{(data: FieldAccessor<number>, env): React.ReactNode => (
					<FormGroup
						label={env.applySystemMiddleware('labelMiddleware', this.props.label)}
						inline={this.props.inlineLabel}
					>
						<InputGroup
							value={typeof data.currentValue === 'number' ? data.currentValue.toFixed(0) : '0'}
							onChange={this.generateOnChange(data)}
							large={this.props.large}
							type="number"
						/>
					</FormGroup>
				)}
			</Field>
		)
	}

	private generateOnChange = (data: FieldAccessor<number>) => (e: ChangeEvent<HTMLInputElement>) => {
		data.onChange && data.onChange(parseInt(e.target.value, 10))
	}

	public static generateSyntheticChildren(props: NumberFieldProps, environment: Environment): React.ReactNode {
		return Parser.generateWrappedNode(props.name, fieldName => <Field name={fieldName} />, environment)
	}
}

type EnforceDataBindingCompatibility = EnforceSubtypeRelation<
	typeof NumberField,
	SyntheticChildrenProvider<NumberFieldProps>
>