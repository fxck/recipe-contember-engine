import { Acl, Input, Model } from 'cms-common'
import Authorizator from '../../../acl/Authorizator'

export default class UpdateEntityRelationAllowedOperationsVisitor
	implements Model.ColumnVisitor<never>, Model.RelationByTypeVisitor<Input.UpdateRelationOperation[]> {
	constructor(private readonly authorizator: Authorizator) {}

	visitColumn(): never {
		throw new Error()
	}

	public visitManyHasManyInversed({}, {}, targetEntity: Model.Entity, targetRelation: Model.ManyHasManyOwnerRelation) {
		return this.getAllowedOperations(targetEntity, targetEntity, targetRelation)
	}

	public visitManyHasManyOwner(
		entity: Model.Entity,
		relation: Model.ManyHasManyOwnerRelation,
		targetEntity: Model.Entity
	) {
		return this.getAllowedOperations(targetEntity, entity, relation)
	}

	public visitOneHasMany({}, {}, targetEntity: Model.Entity, targetRelation: Model.ManyHasOneRelation) {
		return this.getAllowedOperations(targetEntity, targetEntity, targetRelation)
	}

	public visitManyHasOne(entity: Model.Entity, relation: Model.ManyHasOneRelation, targetEntity: Model.Entity) {
		const operations = this.getAllowedOperations(targetEntity, entity, relation)
		if (relation.nullable) {
			return operations
		}
		const forbiddenOperations = [Input.UpdateRelationOperation.delete, Input.UpdateRelationOperation.disconnect]
		return operations.filter(it => !forbiddenOperations.includes(it))
	}

	public visitOneHasOneInversed(
		{},
		relation: Model.OneHasOneInversedRelation,
		targetEntity: Model.Entity,
		targetRelation: Model.OneHasOneOwnerRelation
	) {
		const operations = this.getAllowedOperations(targetEntity, targetEntity, targetRelation)
		if (relation.nullable && targetRelation.nullable) {
			return operations
		}
		return operations.filter(it => it === Input.UpdateRelationOperation.update)
	}

	public visitOneHasOneOwner(
		entity: Model.Entity,
		relation: Model.OneHasOneOwnerRelation,
		targetEntity: Model.Entity,
		targetRelation: Model.OneHasOneInversedRelation | null
	) {
		const operations = this.getAllowedOperations(targetEntity, entity, relation)
		if (relation.nullable && (!targetRelation || targetRelation.nullable)) {
			return operations
		}
		return operations.filter(it => it === Input.UpdateRelationOperation.update)
	}

	private getAllowedOperations(
		targetEntity: Model.Entity,
		owningEntity: Model.Entity,
		owningRelation: Model.Relation
	): Input.UpdateRelationOperation[] {
		const result: Input.UpdateRelationOperation[] = []

		const canReadTargetEntity = this.authorizator.isAllowed(Acl.Operation.read, targetEntity.name)
		const canCreateTargetEntity = this.authorizator.isAllowed(Acl.Operation.create, targetEntity.name)
		const canUpdateTargetEntity = this.authorizator.isAllowed(Acl.Operation.update, targetEntity.name)
		const canDeleteTargetEntity = this.authorizator.isAllowed(Acl.Operation.delete, targetEntity.name)
		const canUpdateOwningRelation = this.authorizator.isAllowed(
			Acl.Operation.update,
			owningEntity.name,
			owningRelation.name
		)

		if (canReadTargetEntity && canUpdateOwningRelation) {
			result.push(Input.UpdateRelationOperation.connect)
			result.push(Input.UpdateRelationOperation.disconnect)
		}

		if (canCreateTargetEntity && canUpdateOwningRelation) {
			result.push(Input.UpdateRelationOperation.create)
		}
		if (canUpdateTargetEntity && canUpdateOwningRelation) {
			result.push(Input.UpdateRelationOperation.update)
		}
		if (canCreateTargetEntity && canUpdateTargetEntity && canUpdateOwningRelation) {
			result.push(Input.UpdateRelationOperation.upsert)
		}
		if (canDeleteTargetEntity && canUpdateOwningRelation) {
			result.push(Input.UpdateRelationOperation.delete)
		}

		return result
	}
}
