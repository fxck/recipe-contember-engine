import { Differ } from '../ModificationHandler.js'
import { Schema } from '@contember/schema'
import { RemoveEntityModification } from '../entities/index.js'

export class ChangeViewNonViewDiffer implements Differ {
	createDiff(originalSchema: Schema, updatedSchema: Schema) {
		return Object.values(updatedSchema.model.entities)
			.filter(it => {
				const origEntity = originalSchema.model.entities[it.name]
				if (!origEntity) {
					return false
				}
				return !!origEntity.view !== !!it.view
			})
			.map(it => RemoveEntityModification.createModification({ entityName: it.name }))
	}
}
