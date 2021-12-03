import { Command, CommandConfiguration, Input, validateProjectName, Workspace } from '@contember/cli-common'
import { Model, Schema } from '@contember/schema'
import { validateSchemaAndPrintErrors } from '../../utils/schema'
import { acceptEveryFieldVisitor } from '@contember/schema-utils'

type Args = {
	project: string
}

type Options = {
}

export class ProjectDescribeCommand extends Command<Args, Options> {
	protected configure(configuration: CommandConfiguration<Args, Options>): void {
		configuration.description('Describes project schema')
		configuration.argument('project')
	}

	protected async execute(input: Input<Args, Options>): Promise<number> {
		const projectName = input.getArgument('project')
		const workspace = await Workspace.get(process.cwd())

		validateProjectName(projectName)
		const project = await workspace.projects.getProject(projectName, { fuzzy: true })
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const schema: Schema = require(project.apiDir).default
		if (!validateSchemaAndPrintErrors(schema, 'Defined schema is invalid:')) {
			return 1
		}
		const sortedEntities = Object.values(schema.model.entities).sort((a, b) => a.name.localeCompare(b.name))

		const entityReferences: Record<string, {
			owningEntity: Model.Entity
			owningRelation: Model.OneHasOneOwningRelation | Model.ManyHasOneRelation
			targetEntity: Model.Entity
			targetRelation: Model.OneHasOneInverseRelation | Model.OneHasManyRelation | null
		}[]> = Object.fromEntries(Object.keys(schema.model.entities).map(it => [it, []]))
		for (const entity of sortedEntities) {
			acceptEveryFieldVisitor<void>(schema.model, entity, {
				visitColumn: () => null,
				visitManyHasManyInverse: () => null,
				visitManyHasManyOwning: () => null,
				visitOneHasOneInverse: () => null,
				visitOneHasMany: () => null,
				visitOneHasOneOwning: (owningEntity, owningRelation, targetEntity, targetRelation) => {
					entityReferences[targetEntity.name].push({ owningEntity, owningRelation, targetEntity, targetRelation })
				},
				visitManyHasOne: (owningEntity, owningRelation, targetEntity, targetRelation) => {
					entityReferences[targetEntity.name].push({ owningEntity, owningRelation, targetEntity, targetRelation })
				},
			})
		}

		const printEntityOnDeleteBehaviour = (entity: Model.Entity, visited: string[]): string => {
			const referencedFrom = entityReferences[entity.name]
			if (referencedFrom.length === 0) {
				return visited.length === 0 ? `<ul><li>Not referenced</li></ul>` : ``
			}
			if (visited.includes(entity.name)) {
				return `<ul><li>(recursion)</li></ul>`
			}
			return `
				<ul>
				${referencedFrom
		.sort((a, b) =>
			a.owningRelation.joiningColumn.onDelete.localeCompare(b.owningRelation.joiningColumn.onDelete)
					|| a.owningEntity.name.localeCompare(b.owningEntity.name)
					|| a.owningRelation.name.localeCompare(b.owningRelation.name),
		).map(it => {
			const inverseDescr = it.targetRelation ? `${entity.name}::${it.targetRelation.name}` : 'no inverse side'
			if (it.owningRelation.joiningColumn.onDelete === Model.OnDelete.restrict) {
				return `<li>Fails when referenced from ${it.owningEntity.name}::${it.owningRelation.name} (${inverseDescr})</li>`
			}
			if (it.owningRelation.joiningColumn.onDelete === Model.OnDelete.setNull) {
				return `<li>Sets null at ${it.owningEntity.name}::${it.owningRelation.name} (${inverseDescr})</li>`
			}
			if (it.owningRelation.joiningColumn.onDelete === Model.OnDelete.cascade) {
				return `<li>Deletes ${it.owningEntity.name} connected using ${it.owningRelation.name} (${inverseDescr}) ${printEntityOnDeleteBehaviour(it.owningEntity, [...visited, entity.name])}</li>`
			}
		}).join('')}
				</ul>
			`
		}
		let result = ''
		for (const entity of sortedEntities) {
			result += `<h2>${entity.name}</h2>`
			result += printEntityOnDeleteBehaviour(entity, [])
		}
		console.log(result)

		return 0
	}
}
