import { DecoratorFunction } from './types.js'
import { extendEntity } from './extensions.js'
import { NamingHelper } from '@contember/schema-utils'

export type UniqueOptions<T> = { name?: string; fields: (keyof T)[] }
export function Unique<T>(options: UniqueOptions<T>): DecoratorFunction<T>
export function Unique<T>(...fields: (keyof T)[]): DecoratorFunction<T>
export function Unique<T>(options: UniqueOptions<T> | keyof T, ...args: (keyof T)[]): DecoratorFunction<T> {
	return extendEntity(({ entity }) => {
		const fields = (typeof options !== 'object' ? [options, ...args] : options.fields) as string[]
		const name =
			typeof options === 'object' && options.name
				? options.name
				: NamingHelper.createUniqueConstraintName(entity.name, fields)
		return {
			...entity,
			unique: {
				[name]: { name, fields },
				...entity.unique,
			},
		}
	})
}
