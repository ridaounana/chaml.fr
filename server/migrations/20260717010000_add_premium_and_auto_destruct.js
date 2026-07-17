export const up = async (knex) => {
  await knex.schema.alterTable("couples", (table) => {
    table.boolean("is_premium").defaultTo(false);
    table.timestamp("dossier_completed_at", { useTz: true }).nullable();
  });
};

export const down = async (knex) => {
  await knex.schema.alterTable("couples", (table) => {
    table.dropColumn("is_premium");
    table.dropColumn("dossier_completed_at");
  });
};
