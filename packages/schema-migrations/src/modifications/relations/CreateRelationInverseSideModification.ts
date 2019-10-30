import { MigrationBuilder } from 'node-pg-migrate'
import { Model, Schema } from '@contember/schema'
import { ContentEvent } from '@contember/engine-common'
import { addField, SchemaUpdater, updateEntity, updateField, updateModel } from '../schemaUpdateUtils'
import { Modification } from '../Modification'

class CreateRelationInverseSideModification implements Modification<CreateRelationInverseSideModification.Data> {
	constructor(private readonly data: CreateRelationInverseSideModification.Data, private readonly schema: Schema) {}

	public createSql(builder: MigrationBuilder): void {}

	public getSchemaUpdater(): SchemaUpdater {
		return updateModel(
			updateEntity(this.data.entityName, addField(this.data.relation)),
			updateEntity(
				this.data.relation.target,
				updateField<Model.AnyRelation & Model.OwnerRelation>(this.data.relation.ownedBy, field => ({
					...field,
					inversedBy: this.data.relation.name,
				})),
			),
		)
	}

	public transformEvents(events: ContentEvent[]): ContentEvent[] {
		return events
	}
}

namespace CreateRelationInverseSideModification {
	export const id = 'createRelationInverseSide'

	export interface Data {
		entityName: string
		relation: Model.AnyRelation & Model.InversedRelation
	}
}

export default CreateRelationInverseSideModification
