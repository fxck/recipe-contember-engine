import * as React from 'react'
import { Justification } from '../../types'
import cn from 'classnames'
import { toEnumViewClass, toViewClass } from '../../utils'
import { UseTableElementContext } from './Table'

export interface TableCellProps {
	children?: React.ReactNode
	justification?: Justification
	shrunk?: boolean
}

export const TableCell = React.memo(({ shrunk = false, ...props }: TableCellProps) => {
	const useTableElement = React.useContext(UseTableElementContext)
	const className = cn('table-cell', toEnumViewClass(props.justification), toViewClass('shrunk', shrunk))

	if (useTableElement) {
		return <td className={className}>{props.children}</td>
	}
	return <div className={className}>{props.children}</div>
})
TableCell.displayName = 'TableCell'
