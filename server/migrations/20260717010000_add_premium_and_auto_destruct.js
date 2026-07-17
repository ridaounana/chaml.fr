export const up = async (knex) => {
  const hasIsPremium = await knex.schema.hasColumn("couples", "is_premium");
  const hasDossierCompletedAt = await knex.schema.hasColumn("couples", "dossier_completed_at");
  
  if (!hasIsPremium || !hasDossierCompletedAt) {
    await knex.schema.alterTable("couples", (table) => {
      if (!hasIsPremium) {
        table.boolean("is_premium").defaultTo(false);
      }
      if (!hasDossierCompletedAt) {
        table.timestamp("dossier_completed_at", { useTz: true }).nullable();
      }
    });
  }
};

export const down = async (knex) => {
  await knex.schema.alterTable("couples", (table) => {
    table.dropColumn("is_premium");
    table.dropColumn("dossier_completed_at");
  });
};
