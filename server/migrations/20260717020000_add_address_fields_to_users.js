export const up = async (knex) => {
  const hasAddress = await knex.schema.hasColumn("users", "address");
  const hasCity = await knex.schema.hasColumn("users", "city");
  const hasDepartment = await knex.schema.hasColumn("users", "department");
  const hasZone = await knex.schema.hasColumn("users", "zone");
  const hasLivingSurface = await knex.schema.hasColumn("users", "living_surface");
  const hasFamilySize = await knex.schema.hasColumn("users", "family_size");

  await knex.schema.alterTable("users", (table) => {
    if (!hasAddress) table.string("address", 255);
    if (!hasCity) table.string("city", 50);
    if (!hasDepartment) table.string("department", 10);
    if (!hasZone) table.string("zone", 5);
    if (!hasLivingSurface) table.decimal("living_surface").defaultTo(0);
    if (!hasFamilySize) table.integer("family_size").defaultTo(2);
  });
};

export const down = async (knex) => {
  await knex.schema.alterTable("users", (table) => {
    table.dropColumn("address");
    table.dropColumn("city");
    table.dropColumn("department");
    table.dropColumn("zone");
    table.dropColumn("living_surface");
    table.dropColumn("family_size");
  });
};
