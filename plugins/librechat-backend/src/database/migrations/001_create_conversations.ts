import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('conversations', table => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.string('user_id', 255).notNullable().index();
    table.string('agent_id', 255).notNullable();
    table.string('title', 500).nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.index(['updated_at'], 'idx_conversations_updated_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('conversations');
}
