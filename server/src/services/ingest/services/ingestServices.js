import logger from "../../../shared/config/logger.js";
import AppError from "../../../shared/utils/AppError.js";
import { v4 as uuidv4 } from "uuid";

/**
 * Service class is responsible for handling business logic of injesting API hit data. The IngestService class takes an EventProducer as a dependency, which is used to publish API hit events to RabbitMQ.
 * The ingestApiHit() method validates incoming hit data, constructs and event object, and attempts to publish it using EventProducer. If circuitBreaker rejects the request, it returns a response indicating that service is temporarily unavailable.
 * The validateHitData() method ensures that all required fields are present & valid before processing the hit data.
 * @class IngestService
 * @constructor
 * @param {Object} dependencies - The dependencies required by IngestService.
 * @param {EventProducer} dependencies.eventProducer - The EventProducer instance for publishing events to RabbitMQ.
 */
export class IngestService {
  constructor({ eventProducer }) {
    if (!eventProducer) throw new Error("IngestService requires eventProducer");
    this.eventProducer = eventProducer;
  }

  /**
   * Ingests an API Hit by validating the hit data and publishing an event to RabbitMQ.
   * @param {Object} hitData - The API hit data to be ingested.
   * @returns {Promise<Object>} - The result of ingestion, including eventID and status.
   */
  async ingestApiHit(hitData) {
    try {
      this.validateHitData(hitData);

      const event = {
        eventId: uuidv4(),
        timestamp: new Date(),
        serviceName: hitData.serviceName,
        endpoint: hitData.endpoint,
        method: hitData.method.toUpperCase(),
        statusCode: parseInt(hitData.statusCode, 10),
        latencyMs: parseFloat(hitData.latencyMs),
        clientId: hitData.clientId,
        apiKeyId: hitData.apiKeyId,
        ip: hitData.ip || "unknown",
        userAgent: hitData.userAgent || "",
      };

      const published = await this.eventProducer.publishApiHit(event);

      if (!published) {
        // CircuitBreaker rejected the request
        logger.warn("API hit reject by circuit breaker", {
          eventId: event.eventId,
          endpoint: event.endpoint,
          method: event.method,
          clientId: event.clientId,
        });

        return {
          eventId: event.eventId,
          status: "rejected",
          reason: "service_unavailable",
          timestamp: event.timestamp,
        };
      }

      logger.info("API hit ingested", {
        eventId: event.eventId,
        endpoint: event.endpoint,
        method: event.method,
        clientId: event.clientId,
      });

      return {
        eventId: event.eventId,
        status: "queued",
        timestamp: event.timestamp,
      };
    } catch (error) {
      logger.error("Error ingesting API Hit", error);
      throw error;
    }
  }

  /**
   * Validates API hit data to ensure all required fields are present and valid.
   * @param {Object} hitData - The api hit data to be validated.
   * @throws {AppError} - If any required fields are missing or invalid.
   */
  validateHitData(hitData) {
    const requiredFields = [
      "serviceName",
      "endpoint",
      "method",
      "statusCode",
      "latencyMs",
      "clientId",
    ];

    const missingFields = requiredFields.filter((field) => !hitData[field]);

    if (missingFields.length > 0) {
      throw new AppError(
        `Missing required fields: ${missingFields.join(",")}`,
        400,
      );
    }

    const validMethods = [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
      "HEAD",
    ];

    if (!validMethods.includes(hitData.method.toUpperCase())) {
      throw new AppError(`Invalid HTTP method: ${hitData.method}`, 400);
    }

    const statusCode = parseInt(hitData.statusCode, 10);
    if (isNaN(statusCode) || statusCode < 100 || statusCode > 599) {
      throw new AppError(`Invalid status code: ${hitData.statusCode}`, 400);
    }

    const latency = parseFloat(hitData.latencyMs);
    if (isNaN(latency) || latency < 0) {
      throw new AppError(`Invalid latency: ${hitData.latencyMs}`, 400);
    }
  }
}
