import ResponseFormatter from "../utils/responseFormatter.js";
import logger from "../config/logger.js";
import clientContainer from "../../services/client/Dependencies/dependencies.js";

/**
 * MiddleWare to validate API Keys against DB
 * Used for external services posting events
 */
const validateApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers["x-api-key"];

    if (!apiKey) {
      logger.warn("API request without API Key", {
        path: req.path,
        ip: req.ip,
      });

      return res
        .status(401)
        .json(ResponseFormatter.error("API Key is required", 401));
    }

    // Get client and API key from DB
    const result =
      await clientContainer.services.clientServices.getClientByApiKey(apiKey);

    if (!result) {
      logger.warn("Invalid API Key attempted", {
        path: req.path,
        ip: req.ip,
        apiKey: apiKey.substring(0, 2) + "...", // log partial key for security
      });
      return res
        .status(403)
        .json(ResponseFormatter.error("Invalid API Key", 403));
    }

    const { client, apiKey: apiKeyObj } = result;

    // check if the client is active
    if (!client.isActive) {
      logger.warn("Inactive client attempted API access", {
        path: req.path,
        ip: req.ip,
        clientId: client._id,
      });
      return res
        .status(403)
        .json(ResponseFormatter.error("Client account is inactive", 403));
    }

    // Usage limits removed - no monthly usage checks

    // check API key permissions
    if (!apiKeyObj.permissions?.canIngest) {
      logger.warn("API Key without ingest permission attempted access", {
        path: req.path,
        ip: req.ip,
        apiKey: apiKeyObj._id,
      });
      return res
        .status(403)
        .json(
          ResponseFormatter.error(
            "API Key does not have permission to ingest data",
            403,
          ),
        );
    }

    // No API Key usage tracking is required

    // Add client & API Key info to request
    req.client = client;
    req.apiKey = apiKeyObj;

    logger.debug("API key validated successfully", {
      clientId: client._id,
      clientName: client.name,
      apiKeyId: apiKeyObj._id,
    });

    next();
  } catch (error) {
    logger.error("Error validating API Key", error);
    return res
      .status(500)
      .json(ResponseFormatter.error("Internal Server Error", 500));
  }
};

export default validateApiKey;
