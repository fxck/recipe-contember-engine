import { SelectBuilder } from '@contember/database'
import { StageWithId } from '../../dtos/index.js'

export const prepareStageQueryBuilder = () => {
	return SelectBuilder.create<StageWithId>() //
		.select('id')
		.select('name')
		.select('slug')
		.from('stage')
}
