import ResponseFormatter from "../utils/responseFormatter.js";

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
