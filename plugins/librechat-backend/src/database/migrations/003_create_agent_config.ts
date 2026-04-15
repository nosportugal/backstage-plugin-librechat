import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('agent_config', table => {
    table.integer('id').primary().defaultTo(1);
    table.string('agent_id', 255).notNullable();
    table.string('api_key_ref', 500).notNullable();
    table.text('greeting_message').nullable();
    table.string('bubble_position', 20).notNullable().defaultTo('bottom-right');
    table.boolean('enabled').notNullable().defaultTo(true);
    table.json('allowed_groups').notNullable().defaultTo('[]');
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.string('updated_by', 255).notNullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('agent_config');
}
