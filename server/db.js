import pg from "pg";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "chaml_db",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
});

// Database query wrapper
export const query = (text, params) => pool.query(text, params);

// Auto-run schema.sql on startup
export const initializeDatabase = async () => {
  try {
    console.log("Connecting to PostgreSQL database...");
    // Test database connection
    await pool.query("SELECT 1");
    console.log("PostgreSQL connection verified.");

    const schemaPath = path.join(__dirname, "schema.sql");
    if (fs.existsSync(schemaPath)) {
      console.log("Running database schema script schema.sql...");
      const schemaSql = fs.readFileSync(schemaPath, "utf-8");
      await pool.query(schemaSql);
      console.log("Database schema applied successfully.");
    }
  } catch (err) {
    console.error("Database connection or schema execution failed:", err.message);
    console.warn("Please make sure PostgreSQL is running, and the database 'chaml_db' is created.");
  }
};
