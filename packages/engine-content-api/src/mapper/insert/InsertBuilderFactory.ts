import { PathFactory, WhereBuilder } from '../select/index.js'
import { Model } from '@contember/schema'
import { InsertBuilder } from './InsertBuilder.js'

export class InsertBuilderFactory {
	constructor(
		private readonly schema: Model.Schema,
		private readonly whereBuilder: WhereBuilder,
		private readonly pathFactory: PathFactory,
	) {}

	public create(entity: Model.Entity): InsertBuilder {
		return new InsertBuilder(this.schema, entity, this.whereBuilder, this.pathFactory)
	}
}
