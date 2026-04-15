import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('messages', table => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table
      .uuid('conversation_id')
      .notNullable()
      .references('id')
      .inTable('conversations')
      .onDelete('CASCADE')
      .index();
    table.string('role', 20).notNullable();
    table.text('content').notNullable();
    table.string('status', 20).notNullable().defaultTo('delivered');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.index(['created_at'], 'idx_messages_created_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('messages');
}
