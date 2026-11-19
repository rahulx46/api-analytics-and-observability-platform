import config from "../../config/index.js";
import logger from "../../config/logger.js";
import rabbitmq from "../../config/rabbitmq.js";

import { CircuitBreaker } from "./CircuitBreaker.js";
import { ConfirmChannelManager } from "./ConfirmChannelManager.js";
import { RetryStrategy } from "./RetryStrategy.js";
import { EventProducer } from "./eventProducer.js";

/**
 *
 * @param {Object} [overrides] - Optional overrides for dependencies.
 * @param {Object} [overrides.logger] - Custom logger instance.
 * @param {Object} [overrides.rabbitmq] - custom RabbitMQ connection manager.
 * @param {string} [overrides.queueName] - custom queue name
 * @param {Object} [overrides.channelManager] - custom channel manager
 * @param {Object} [overrides.circuitBreaker] - custom circuitBreaker instance
 * @param {Object} [overrides.retryStrategy] - custom retry strategy instance
 * @returns {EventProducer}
 */
export function createEventProducer(overrides = {}) {
  const log = overrides.logger ?? logger;
  const rmq = overrides.rabbitmq ?? rabbitmq;
  const queueName = overrides.queueName ?? config.rabbitmq.queue;

  // validate critical dependencies
  if (!rmq) throw new Error("RabbitMQ connection manager is required");
  if (!queueName) throw new Error("Queue name is required");
  if (!config.rabbitmq.retryAttempts || config.rabbitmq.retryAttempts < 0) {
    throw new Error("Invalid retry attempts configuration");
  }

  // The ConfirmChannelManager is responsible for managing a RabbitMQ confirm channel, which allows producer to receive acknowledgements from the broker for pubished message. This is crucial for ensuring message delivery & handling back-pressure effectively.
  const channelManager =
    overrides.channelManager ??
    new ConfirmChannelManager({ rabbitmq: rmq, logger: log });

  // The circuit breaker is configured with a low failure threshold and a cooldown period to quickly react to issues with message broker, while allowing recovery attempts.
  // The retry strategy is configured to use an exponential backoff with jitter to avoid overwhelming the broker during transient failures.
  const circuitBreaker =
    overrides.circuitBreaker ??
    new CircuitBreaker({
      failureThreshold: 2,
      cooldownMs: 30_000,
      halfOpenMaxAttempts: 3,
      logger: log,
    });

  // The retry strategy will use an exponential backoff with jitter, and the parameters can be configured via application's config file.
  const retryStrategy =
    overrides.retryStrategy ??
    new RetryStrategy({
      maxRetries: config.rabbitmq.retryAttempts,
      baseDelayMs: config.rabbitmq.retryDelay,
      maxDelayMs: 5_000,
      jitterFactor: 0.3,
    });

  // Create and return EventProducer instance with all dependencies injected
  return new EventProducer({
    channelManager,
    circuitBreaker,
    retryStrategy,
    logger: log,
    queueName,
  });
}
