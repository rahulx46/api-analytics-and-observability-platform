import ResponseFormatter from "../utils/responseFormatter.js";

/**
 * Middleware to authorize requests based on user roles
 * @param {Array<string>} - allowedRoles: The roles allowed to access the route
 * @returns {Function} - Returns a middleware function
 * @throws {Error} - Throws an error if the user is not authorized
 * This middleware checks if the authenticated user has the necessary role
 * If the user doesn't have required role, it respond with a 403 forbidden status
 * If the user is authorized, it calls the next middleware in the stack
 */

const authorize =
  (allowedRoles = []) =>
  (req, res, next) => {
    try {
      if (!req.user || !req.user.role) {
        return res.status(403).json(ResponseFormatter.error("Forbidden", 403));
      }

      //skip
      if (allowedRoles.length === 0) {
        return next();
      }

      if (!allowedRoles.includes(req.user.role)) {
        return res
          .status(403)
          .json(ResponseFormatter.error("Insufficient permissions", 403));
      }

      return next();
    } catch (error) {
      return res.status(403).json(ResponseFormatter.error("Forbidden", 403));
    }
  };

export default authorize;
