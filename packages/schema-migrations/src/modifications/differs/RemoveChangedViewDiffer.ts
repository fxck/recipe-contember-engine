import { Differ } from '../ModificationHandler.js'
import { Model, Schema } from '@contember/schema'
import deepEqual from 'fast-deep-equal'
import { RemoveEntityModification } from '../entities/index.js'
import { getViewDirectDependants } from '../utils/viewDependencies.js'
import { Migration } from '../../Migration.js'

export class RemoveChangedViewDiffer implements Differ {
	constructor() {
	}

	createDiff(originalSchema: Schema, updatedSchema: Schema) {
		const changedViews = Object.values(originalSchema.model.entities)
			.filter(it => {
				const updatedEntity = updatedSchema.model.entities[it.name]
				if (!updatedEntity || !it.view || !updatedEntity.view) {
					return false
				}
				return !deepEqual(updatedEntity.view, it.view)
			})
		if (changedViews.length === 0) {
			return []
		}
		const removed = new Set<string>()
		const dependants = getViewDirectDependants(originalSchema.model)
		const modifications: Migration.Modification[] = []
		const removeCascade = (entity: Model.Entity) => {
			if (removed.has(entity.name)) {
				return
			}
			removed.add(entity.name)
			for (const dependant of dependants.get(entity.name) ?? []) {
				removeCascade(dependant)
			}
			modifications.push(RemoveEntityModification.createModification({ entityName: entity.name }))
		}
		for (const changed of changedViews) {
			removeCascade(changed)
		}
		return modifications
	}
}
