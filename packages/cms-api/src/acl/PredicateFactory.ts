import { Acl, Input, Model } from 'cms-common'
import VariableInjector from './VariableInjector'

class PredicateFactory {
	constructor(private readonly permissions: Acl.Permissions, private readonly variableInjector: VariableInjector) {}

	public create(entity: Model.Entity, operation: Acl.Operation.delete): Input.Where
	public create(
		entity: Model.Entity,
		operation: Acl.Operation.update | Acl.Operation.read | Acl.Operation.create,
		fieldNames: string[]
	): Input.Where
	public create(entity: Model.Entity, operation: Acl.Operation, fieldNames?: string[]): Input.Where {
		const entityPermissions: Acl.EntityPermissions = this.permissions[entity.name]
		const neverCondition: Input.Where = { [entity.primary]: { never: true } }

		if (!entityPermissions) {
			return neverCondition
		}

		let predicates: Acl.PredicateReference[]
		if (operation === Acl.Operation.delete) {
			const deletePredicate = entityPermissions.operations.delete
			if (deletePredicate === undefined) {
				return neverCondition
			}
			if (deletePredicate === true) {
				return {}
			}
			predicates = [deletePredicate]
		} else {
			if (fieldNames === undefined) {
				throw new Error()
			}
			const fieldPermissions = entityPermissions.operations[operation]
			if (fieldPermissions === undefined) {
				return neverCondition
			}
			const operationPredicates = this.getRequiredPredicates(fieldNames, fieldPermissions)
			if (operationPredicates === false) {
				return neverCondition
			}
			predicates = operationPredicates
		}

		const predicatesWhere: Input.Where[] = predicates.reduce(
			(result: Input.Where[], name: Acl.PredicateReference): Input.Where[] => {
				if (!entityPermissions.predicates[name]) {
					throw new Error(`${entity.name}: Undefined predicate ${name}`)
				}
				const predicateWhere: Input.Where = this.variableInjector.inject(entity, entityPermissions.predicates[name])
				return [...result, predicateWhere]
			},
			[]
		)
		if (predicatesWhere.length === 0) {
			return {}
		}
		if (predicatesWhere.length === 1) {
			return predicatesWhere[0]
		}

		return { and: predicatesWhere }
	}

	private getRequiredPredicates(
		fieldNames: string[],
		fieldPermissions: Acl.FieldPermissions
	): Acl.PredicateReference[] | false {
		const predicates: Acl.PredicateReference[] = []
		for (let name of fieldNames) {
			const fieldPredicate = fieldPermissions[name]
			if (!fieldPredicate) {
				return false
			}
			if (fieldPredicate === true) {
				continue
			}
			if (!predicates.includes(fieldPredicate)) {
				predicates.push(fieldPredicate)
			}
		}
		return predicates
	}
}

export default PredicateFactory
