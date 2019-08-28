import { SingleLineTextInputProps, TextInput } from '@contember/ui'
import * as React from 'react'
import DatePicker, { ReactDatePickerProps } from 'react-datepicker'
import { FieldMetadata } from '../../coreComponents'
import { FieldAccessor } from '../../dao'
import { SimpleRelativeSingleField, SimpleRelativeSingleFieldProps } from '../auxiliary'

export type DateFieldProps = SimpleRelativeSingleFieldProps &
	Omit<SingleLineTextInputProps, 'value' | 'onChange' | 'validationState'> & {
		dateFormat?: ReactDatePickerProps['dateFormat']
	}

export const DateField = SimpleRelativeSingleField<DateFieldProps, string>(
	(fieldMetadata, props) => <DateFieldInner fieldMetadata={fieldMetadata} {...props} />,
	'DateField',
)

export interface DateFieldInnerProps extends Omit<DateFieldProps, 'name' | 'label'> {
	fieldMetadata: FieldMetadata<string>
}

export const DateFieldInner = React.memo<DateFieldInnerProps>(props => {
	const generateOnChange = (data: FieldAccessor<string>) => (date: Date | null) => {
		data.updateValue && data.updateValue(date ? date.toISOString() : null)
	}
	const { onFocus: outerOnFocus, onBlur: outerOnBlur } = props
	const UnderlyingTextInput = React.useMemo(
		() =>
			React.forwardRef<any, any>((innerProps, ref) => {
				const { className, onFocus, onBlur, ...legalProps } = innerProps
				return (
					<TextInput
						{...legalProps}
						ref={ref}
						onFocus={(e: React.FocusEvent<HTMLInputElement>) => {
							outerOnFocus && outerOnFocus(e)
							innerProps.onFocus && innerProps.onFocus(e)
						}}
						onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
							outerOnBlur && outerOnBlur(e)
							innerProps.onBlur && innerProps.onBlur(e)
						}}
					/>
				)
			}),
		[outerOnBlur, outerOnFocus],
	)
	return (
		<DatePicker
			selected={props.fieldMetadata.data.currentValue !== null ? new Date(props.fieldMetadata.data.currentValue) : null}
			onChange={generateOnChange(props.fieldMetadata.data)}
			readOnly={props.fieldMetadata.isMutating}
			isClearable={true}
			customInput={<UnderlyingTextInput />}
			dateFormat={props.dateFormat}
		/>
	)
})
