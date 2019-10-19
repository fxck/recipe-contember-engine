import * as React from 'react'
import { SimpleRelativeSingleField, SimpleRelativeSingleFieldProps } from '../auxiliary'

export type HiddenFieldProps = SimpleRelativeSingleFieldProps

export const HiddenField = SimpleRelativeSingleField<HiddenFieldProps>(undefined, 'HiddenField', {
	isNonbearing: true,
})
