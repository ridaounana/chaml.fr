export const up = async (knex) => {
  const hasIsPremium = await knex.schema.hasColumn("couples", "is_premium");
  const hasDossierCompletedAt = await knex.schema.hasColumn("couples", "dossier_completed_at");
  const hasDeletionAlertSent = await knex.schema.hasColumn("couples", "deletion_alert_sent");
  
  if (!hasIsPremium || !hasDossierCompletedAt || !hasDeletionAlertSent) {
    await knex.schema.alterTable("couples", (table) => {
      if (!hasIsPremium) {
        table.boolean("is_premium").defaultTo(false);
      }
      if (!hasDossierCompletedAt) {
        table.timestamp("dossier_completed_at", { useTz: true }).nullable();
      }
      if (!hasDeletionAlertSent) {
        table.boolean("deletion_alert_sent").defaultTo(false);
      }
    });
  }
};

export const down = async (knex) => {
  await knex.schema.alterTable("couples", (table) => {
    table.dropColumn("is_premium");
    table.dropColumn("dossier_completed_at");
    table.dropColumn("deletion_alert_sent");
  });
};
