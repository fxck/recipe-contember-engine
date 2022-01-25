import { SchemaDefinition as def } from '@contember/schema-definition'
import { Model } from '@contember/schema'
import { SQL } from '../../src/tags.js'
import { testMigrations } from '../../src/tests.js'

testMigrations('create a column with default value', {
	originalSchema: def.createModel({
		Author: class Author {
			email = def.stringColumn().unique()
		},
	}),
	updatedSchema: def.createModel({
		Author: class Author {
			name = def.stringColumn().default('unnamed author').notNull()
			email = def.stringColumn().unique()
		},
	}),
	diff: [
		{
			modification: 'createColumn',
			entityName: 'Author',
			field: {
				columnName: 'name',
				name: 'name',
				nullable: false,
				default: 'unnamed author',
				type: Model.ColumnType.String,
				columnType: 'text',
			},
			fillValue: 'unnamed author',
		},
	],
	sql: SQL`ALTER TABLE "author" ADD "name" text;
UPDATE "author" SET "name" = $pga$unnamed author$pga$;
SET CONSTRAINTS ALL IMMEDIATE; SET CONSTRAINTS ALL DEFERRED;
ALTER TABLE "author" ALTER "name" SET NOT NULL;`,
})
