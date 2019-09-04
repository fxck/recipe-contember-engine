import { Input, Model, Value } from '@contember/schema'

export interface Providers {
	uuid: () => string
	now: () => Date
}

export const resolveDefaultValue = (column: Model.AnyColumn, providers: Pick<Providers, 'now'>) => {
	switch (column.type) {
		case Model.ColumnType.String:
		case Model.ColumnType.Int:
		case Model.ColumnType.Enum:
		case Model.ColumnType.Double:
		case Model.ColumnType.Bool:
			if (typeof column.default !== 'undefined') {
				return column.default
			}
			break
		case Model.ColumnType.DateTime:
		case Model.ColumnType.Date:
			if (column.default === 'now') {
				return providers.now().toISOString()
			}
			break
		case Model.ColumnType.Uuid:
			break
		default:
			;((x: never) => {})(column)
	}

	if (column.nullable) {
		return null
	}

	throw new NoDataError(`No data for column ${column.name}`)
}

export const resolvePrimaryGenerator = (column: Model.AnyColumn, providers: Providers): (() => Input.PrimaryValue) => {
	if (column.type === Model.ColumnType.Uuid) {
		return providers.uuid
	}
	throw new Error('not implemented')
}

export const resolveColumnValue = (
	{
		entity,
		column,
		input,
	}: {
		entity: Model.Entity
		column: Model.AnyColumn
		input: Input.ColumnValue | undefined
	},
	providers: Providers,
): Value.AtomicValue => {
	if (input !== undefined) {
		return input as Value.AtomicValue
	}
	if (entity.primary === column.name) {
		return resolvePrimaryGenerator(column, providers)()
	}

	return resolveDefaultValue(column, providers)
}

export class NoDataError extends Error {}
