export interface UuidProvider {
	uuid: () => string
}

export const isUuid = (value: string): boolean => {
	return (
		value.length === 36 &&
		value.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i) !== null
	)
}
