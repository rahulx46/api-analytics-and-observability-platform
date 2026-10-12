import express from "express";
import cors from "cors";
import helmet from "helmet";
import config from "./shared/config/index.js";
import logger from "./shared/config/logger.js";
import mongodb from "./shared/config/mongodb.js";
import postgres from "./shared/config/postgres.js";
import rabbitmq from "./shared/config/rabbitmq.js";
import errorHandler from "./shared/middlewares/errorHandler.js";
import ResponseFormatter from "./shared/utils/responseFormatter.js";

/**
 * Initialize the Express application
 */
const app = express();

/**
 * Middewares
 */
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  logger.info(` ${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  });
  next();
});

/**
 * Health Check Endpoint
 */
app.get("/health", (req, res) => {
  res.status(200).json(
    ResponseFormatter.success(
      {
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      },
      "Service is healthy",
    ),
  );
});

app.get("/", (req, res) => {
  res.status(200).json(
    ResponseFormatter.success(
      {
        service: "API Hit Monitoring System",
        version: "1.0.0",
        endpoints: {
          health: "/health",
          auth: "/api/auth",
          ingest: "/api/hit",
          analytics: "/api/analytics",
        },
      },
      "API Hit Monitoring Service",
    ),
  );
});

/**
 * 404 handler
 */
app.use((req, res) => {
  res.status(404).json(ResponseFormatter.error("Endpoint not found", 404));
});

app.use(errorHandler);

async function initializeConnection() {
  try {
    logger.info("Initializing database connections...");

    // connect to MongoDB
    await mongodb.connect();

    // connect to PostgreSQL
    await postgres.testConnection();

    // connect to RabbitMQ
    await rabbitmq.connect();

    logger.info("All connections initialized successfully.");
  } catch (error) {
    logger.error("Error initializing database connections:", error);
    throw error;
  }
}

async function startServer() {
  try {
    await initializeConnection();

    const server = app.listen(config.port, () => {
      logger.info(`Server is running on port ${config.port}`);
      logger.info(`Environment: ${config.node_env}`);
      logger.info(`API available at: ${config.port}`);
    });

    const gracefulShutdown = async (signal) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);

      server.close(async () => {
        logger.info("HTTP server closed.");

        try {
          await mongodb.disconnect();
          await postgres.close();
          await rabbitmq.close();
          logger.info("All connections closed, exiting process...");
          process.exit(0);
        } catch (error) {
          logger.error("Error during shutdown:", error);
          process.exit(1);
        }
      });

      setTimeout(() => {
        logger.error("Forced shutdown");
        process.exit(1);
      }, 10000);
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));

    // HANDLE UNCAUGHT EXCEPTIONS
    process.on("uncaughtException", (error) => {
      logger.error("Uncaught Exception:", error);
      gracefulShutdown("uncaughtException");
    });

    process.on("unhandledRejection", (reason, promise) => {
      logger.error("Unhandled Rejection at:", promise, "reason:", reason);
      gracefulShutdown("unhandledRejection");
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
