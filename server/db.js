import pg from "pg";
import dotenv from "dotenv";
import knex from "knex";
import knexConfig from "./knexfile.js";

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "chaml_db",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
});

// Database query wrapper used throughout backend
export const query = (text, params) => pool.query(text, params);

// Runs database migrations on server start
export const initializeDatabase = async () => {
  try {
    console.log("Connecting to PostgreSQL database...");
    // Test database connection
    await pool.query("SELECT 1");
    console.log("PostgreSQL connection verified.");

    console.log("Ensuring PII columns accommodate AES-256 encrypted cipherstrings...");
    try {
      await pool.query(`
        ALTER TABLE users ALTER COLUMN first_name TYPE TEXT;
        ALTER TABLE users ALTER COLUMN last_name TYPE TEXT;
        ALTER TABLE users ALTER COLUMN phone TYPE TEXT;
        ALTER TABLE users ALTER COLUMN city TYPE TEXT;
        ALTER TABLE users ALTER COLUMN department TYPE TEXT;
        ALTER TABLE users ALTER COLUMN address TYPE TEXT;
      `);
      console.log("✅ PII column types updated to TEXT.");
    } catch (alterErr) {
      // Table might not exist yet before first migration
      console.log("Note: PII column alter skipped (table will be created by migrations).");
    }

    try {
      await pool.query("ALTER TABLE site_config ADD COLUMN IF NOT EXISTS app_domain VARCHAR(255) DEFAULT 'chaml' || '.fr'");
      console.log("✅ Column 'app_domain' ensured in 'site_config' table.");
    } catch (configAlterErr) {
      console.log("Note: site_config alter skipped:", configAlterErr.message);
    }

    console.log("Running Knex database migrations...");
    const environment = process.env.NODE_ENV || "development";
    const db = knex(knexConfig[environment]);
    await db.migrate.latest();
    console.log("Database migrations applied successfully.");
    await db.destroy(); // Free the knex instance connection pool
  } catch (err) {
    console.error("Database connection or schema migration failed:", err.message);
    console.warn("Please make sure PostgreSQL is running, and the database 'chaml_db' is created.");
  }
};
