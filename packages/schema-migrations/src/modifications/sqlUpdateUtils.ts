import { MigrationBuilder } from 'node-pg-migrate'

export const createEventTrigger = (builder: MigrationBuilder, tableName: string) => {
	builder.createTrigger(tableName, 'log_event', {
		when: 'AFTER',
		operation: ['INSERT', 'UPDATE', 'DELETE'],
		level: 'ROW',
		function: {
			schema: 'system',
			name: 'trigger_event',
		},
		language: '',
	})
}
