export const up = async (knex) => {
  // Create EXTENSION if not exists
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

  // Table: site_config
  await knex.schema.createTable("site_config", (table) => {
    table.integer("id").primary().defaultTo(1);
    table.string("app_name", 100).defaultTo("Chaml");
    table.string("app_logo", 100).defaultTo("🕌");
    table.decimal("smic_value").defaultTo(1823);
    table.decimal("surface_zone_a").defaultTo(22);
    table.decimal("surface_zone_b").defaultTo(24);
    table.decimal("surface_zone_c").defaultTo(28);
    table.string("smtp_host", 100).defaultTo("smtp.mailgun.org");
    table.integer("smtp_port").defaultTo(587);
    table.string("smtp_user", 100).defaultTo("postmaster@chaml.ma");
    table.string("smtp_password", 255).defaultTo("");
    table.string("smtp_protocol", 10).defaultTo("TLS");
    table.string("smtp_sender_name", 100).defaultTo("Chaml Team");
    table.string("smtp_sender_email", 100).defaultTo("noreply@chaml.ma");
    
    // Add check constraint for single row enforcement
    table.check("id = 1", [], "site_config_id_check");
  });

  // Table: couples
  await knex.schema.createTable("couples", (table) => {
    table.string("id", 50).primary();
    table.boolean("is_approved").defaultTo(false);
    table.timestamp("submitted_at", { useTz: true }).nullable();
    table.string("dossier_status", 20).defaultTo("draft");
  });

  // Table: users
  await knex.schema.createTable("users", (table) => {
    table.string("id", 50).primary();
    table.string("email", 100).unique().notNullable();
    table.string("password_hash", 100).notNullable();
    table.string("role", 20).notNullable();
    table.string("couple_id", 50).references("id").inTable("couples").onDelete("CASCADE");
    table.string("first_name", 50).notNullable();
    table.string("last_name", 50).notNullable();
    table.string("phone", 30);
    table.string("city", 50);
    table.string("department", 10);
    table.string("zone", 5);
    table.decimal("living_surface").defaultTo(0);
    table.integer("family_size").defaultTo(2);
    table.boolean("is_frozen").defaultTo(false);
    table.boolean("is_approved").defaultTo(false);
    table.boolean("is_email_verified").defaultTo(false);
    table.timestamp("created_at", { useTz: true }).defaultTo(knex.fn.now());
  });

  // Table: documents
  await knex.schema.createTable("documents", (table) => {
    table.increments("id").primary();
    table.string("couple_id", 50).references("id").inTable("couples").onDelete("CASCADE").notNullable();
    table.string("doc_key", 50).notNullable();
    table.string("owner", 20).notNullable();
    table.string("category", 30).notNullable();
    table.boolean("required").defaultTo(true);
    table.boolean("uploaded").defaultTo(false);
    table.string("file_name", 255);
    table.string("file_path", 255);
    table.timestamp("uploaded_at", { useTz: true }).nullable();
    table.string("status", 20).defaultTo("pending");
    table.text("comment");
    
    table.unique(["couple_id", "doc_key"], "unique_couple_doc_key");
  });

  // Table: audit_logs
  await knex.schema.createTable("audit_logs", (table) => {
    table.increments("id").primary();
    table.timestamp("created_at", { useTz: true }).defaultTo(knex.fn.now());
    table.string("action", 100).notNullable();
    table.text("details");
    table.string("user_email", 100).notNullable();
  });
};

export const down = async (knex) => {
  await knex.schema.dropTableIfExists("audit_logs");
  await knex.schema.dropTableIfExists("documents");
  await knex.schema.dropTableIfExists("users");
  await knex.schema.dropTableIfExists("couples");
  await knex.schema.dropTableIfExists("site_config");
};
