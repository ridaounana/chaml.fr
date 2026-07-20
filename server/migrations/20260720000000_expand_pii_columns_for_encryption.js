export function up(knex) {
  return knex.schema.alterTable("users", (table) => {
    table.text("first_name").alter();
    table.text("last_name").alter();
    table.text("phone").alter();
    table.text("city").alter();
    table.text("department").alter();
    table.text("address").alter();
  });
}

export function down(knex) {
  return knex.schema.alterTable("users", (table) => {
    table.string("first_name", 50).alter();
    table.string("last_name", 50).alter();
    table.string("phone", 30).alter();
    table.string("city", 100).alter();
    table.string("department", 50).alter();
  });
}
