import pg from "pg";
import config from "./index";
import logger from "./logger";

const { Pool } = pg;

// connection setup
class PostgresConnection {
  constructor() {
    this.pool = null;
  }

  // creating a pool
  getPool() {
    if (!this.pool) {
      this.pool = new Pool({
        host: config.postgres.host,
        port: config.postgres.port,
        database: config.postgres.database,
        user: config.postgres.user,
        password: config.postgres.password,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      this.pool.on("error", (err) => {
        logger.error("Unexpected error on idle Postgres client", {
          error: err.message,
          stack: err.stack,
        });
      });

      logger.info("PG Pool Created.");
      return this.pool;
    }
  }

  async testConnection() {
    try {
      const pool = this.getPool();
      const client = await pool.connect();
      const result = await client.query("SELECT NOW()");
      client.release();
      logger.info(`Postgres connected successfully at ${result.rows[0].now}`);
    } catch (error) {
      logger.error("Failed to connect to PostGres", error);
      throw error;
    }
  }

  // query to execute pg queries
  async query(text, params) {
    const pool = this.getPool();
    const start = Date.now();
    try {
      const result = await pool.query(text, params);
      const duration = Date.now() - start;
      logger.debug("Executed query: ", {
        text,
        duration,
        rows: result.rowCount,
      });
      return result;
    } catch (error) {
      logger.error("Query error: ", { text, error: error.message });
      throw error;
    }
  }

  // close pg connection
  async close() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      logger.info("PostGres pool closed.");
    }
  }
}

export default new PostgresConnection();
