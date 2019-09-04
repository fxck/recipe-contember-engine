export const testUuidPrefix = '123e4567-e89b-12d3-'
export const transactionTestUuid = '123e4567-e89b-12d3-a456-123456789abc'
export const testUuid = (number: number, prefix = 'a456') => {
	return testUuidPrefix + prefix + '-' + number.toString().padStart(12, '0')
}

export const createUuidGenerator = (prefix = 'a456') => {
	let id = 1
	return () => testUuid(id++, prefix)
}
