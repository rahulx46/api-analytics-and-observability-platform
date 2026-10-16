import logger from "../config/logger.js";

/**
 * Request logger middleware - centralizes request logging.
 */

const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info("HTTP request completed", {
      method: req.method,
      path: req.originalUrl || req.url,
      ip: req.ip || req.socket.remoteAddress,
      status: res.statusCode,
      duration,
    });
  });

  next();
};

export default requestLogger;
