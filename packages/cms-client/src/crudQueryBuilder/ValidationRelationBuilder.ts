import { ObjectBuilder } from '../graphQlBuilder'

export class ValidationRelationBuilder {
	public static validationRelation(objectBuilder: ObjectBuilder): ObjectBuilder {
		return objectBuilder.object('validation', builder =>
			builder.field('valid').object('errors', builder =>
				builder
					.object('path', builder =>
						builder
							.field('__typename')
							.fragment('_FieldPathFragment', builder => builder.field('field'))
							.fragment('_IndexPathFragment', builder => builder.field('index').field('alias')),
					)
					.object('message', builder => builder.field('text')),
			),
		)
	}
}
