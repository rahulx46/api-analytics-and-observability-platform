import logger from "../config/logger.js";
import ResponseFormatter from "../utils/responseFormatter.js";

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";
  let errors = err.errors || null;

  if (err.name === "ValidationError") {
    statusCode = 400;
    message = "Validation Error";
    errors = Object.values(err.errors).map((e) => e.message);
  } else if (err.name === "MongoServerError" && err.code === 11000) {
    statusCode = 409;
    message = "Duplicate Key Error";
  } else if (
    err.name === "JsonWebTokenError" ||
    err.name === "TokenExpiredError"
  ) {
    statusCode = 401;
    message =
      err.name === "TokenExpiredError" ? "Token Expired" : "Invalid Token";
  }

  logger.error("Error occured: ", {
    message: err.message,
    statusCode,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  if (statusCode >= 500) {
    message = "Internal Server Error";
    errors = null;
  }

  res
    .status(statusCode)
    .json(ResponseFormatter.error(message, statusCode, errors));
};

export default errorHandler;
