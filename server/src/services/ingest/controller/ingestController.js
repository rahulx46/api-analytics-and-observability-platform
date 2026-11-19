import logger from "../../../shared/config/logger.js";
import ResponseFormatter from "../../../shared/utils/responseFormatter.js";

/**
 * Controller class responsible for handling incoming requests to ingest endpoints.
 * The IngestController class takes an IngestService as a dependency, which is used to process API hit data.
 * The ingestHit() method receives the requests, extracts necessary data, and calls the ingestApiHit() method of IngestService.
 * It also handles response based on whether the ingestion was successful or rejected by CircuitBreaker.
 * The controller ensures that clients receive appropriate feedback based on outcome of their request.
 * @class IngestController
 * @constructor
 * @param {Object} dependencies - The dependencies required by IngestController.
 * @param {IngestService} dependencies.ingestService - The ingest service instance for processing API hit data.
 * @throws {Error} - If the required ingestService dependency is not provided.
 */
export class IngestController {
  constructor({ ingestService }) {
    if (!ingestService)
      throw new Error("IngestController requires ingest service");
    this.ingestService = ingestService;
  }

  /**
   * Handles incoming request to ingest an API hit. It extracts necessary data from the request, calls the ingestApiHit() method of IngestService, and sends an appropriate response based on the result.
   * If ingestion is rejected by circuitBreaker, it returns a 503 Service Unavailable response with details about rejection. If successful, it returns a 202 accepted response indicating that API hit has been queued for processing. The method also includes error handling to pass any exceptions to next middleware in Express.js application.
   * @param {Request} req - The Express.js request object.
   * @param {Response} res - The Express.js response object.
   * @param {Function} next - The next middleware function in Express.js application.
   */
  async ingestHit(req, res, next) {
    try {
      logger.info("Ingest: Client data received", {
        clientId: req.client._id,
        clientName: req.client.name,
        clientKeys: Object.keys(req.client),
      });

      const hitData = {
        ...req.body,
        clientId: req.client._id,
        apiKeyId: req.apiKey._id,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers["user-agent"] || "",
      };

      logger.info("Ingest: Client data prepared", {
        clientId: req.client._id,
        endpoint: hitData.endpoint,
        method: hitData.method,
      });

      const result = await this.ingestService.ingestApiHit(hitData);

      if (result.status === "rejected") {
        return res.status(503).json(
          ResponseFormatter.error("Service temporarily unavailable", 503, {
            eventId: result.eventId,
            reason: result.reason,
            retryAfter: "30 seconds",
          }),
        );
      }

      res
        .status(202)
        .json(
          ResponseFormatter.success(
            result,
            "API Hit queued for processing",
            202,
          ),
        );
    } catch (error) {
      logger.error("Error ingesting API hit", error);
      next(error);
    }
  }
}
