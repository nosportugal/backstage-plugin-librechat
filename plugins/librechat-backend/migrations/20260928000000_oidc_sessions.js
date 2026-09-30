/**
 * Creates the table holding one OIDC session per Backstage user.
 *
 * @param {import('knex').Knex} knex
 */
exports.up = async function up(knex) {
  await knex.schema.createTable("librechat_oidc_sessions", (table) => {
    table.string("user_entity_ref").primary();
    table.text("refresh_token").notNullable();
    table.text("access_token").notNullable();
    table.bigInteger("access_token_expires_at").notNullable();
    table.string("user_label").nullable();
    table.bigInteger("created_at").notNullable();
    table.bigInteger("updated_at").notNullable();
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function down(knex) {
  await knex.schema.dropTable("librechat_oidc_sessions");
};
