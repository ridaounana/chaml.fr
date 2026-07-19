export const up = async (knex) => {
  const hasToken = await knex.schema.hasColumn("users", "reset_password_token");
  const hasExpires = await knex.schema.hasColumn("users", "reset_password_expires");
  
  if (!hasToken || !hasExpires) {
    await knex.schema.alterTable("users", (table) => {
      if (!hasToken) {
        table.string("reset_password_token", 255).nullable();
      }
      if (!hasExpires) {
        table.timestamp("reset_password_expires", { useTz: true }).nullable();
      }
    });
  }
};

export const down = async (knex) => {
  await knex.schema.alterTable("users", (table) => {
    table.dropColumn("reset_password_token");
    table.dropColumn("reset_password_expires");
  });
};
