import amqp from "amqplib";
import config from "./index.js";
import logger from "./logger.js";

class RabbitMQConnection {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.isConnecting = false;
  }

  async connect() {
    if (this.channel) {
      return this.channel;
    }

    if (this.isConnecting) {
      await new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (!this.isConnecting) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
      });
      return this.channel;
    }

    try {
      this.isConnecting = true;

      logger.info("Connecting to RabbitMQ...");
      this.connection = await amqp.connect(config.rabbitmq.url);
      this.channel = await this.connection.createChannel();

      // creating key | queue name
      const dlqName = `${config.rabbitmq.queue}.dlq`; // api_hits.dlq

      // DL Queue
      await this.channel.assertQueue(dlqName, {
        durable: true,
      });

      // Normal queue
      await this.channel.assertQueue(config.rabbitmq.queue, {
        durable: true,
        arguments: {
          "x-dead-letter-exchange": "",
          "x-dead-letter-routing-key": dlqName,
        },
      });

      logger.info("RabbitMQ connected", {
        queue: config.rabbitmq.queue,
      });

      this.connection.on("close", () => {
        logger.error("RabbitMQ connection closed.");
        this.connection = null;
        this.channel = null;
      });

      this.connection.on("error", (err) => {
        logger.error("RabbitMQ connection error", err);
        this.connection = null;
        this.channel = null;
      });

      this.isConnecting = false;
      return this.channel;
    } catch (error) {
      this.isConnecting = false;
      logger.error("Failed to connect to RabbitMQ", error);
      throw error;
    }
  }

  getChannel() {
    return this.channel;
  }

  getStatus() {
    if (!this.connection || !this.channel) return "Disconnected.";
    if (this.connection.closing) return "closing.";
    return "connected.";
  }

  async close() {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }
      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }
      logger.info("RabbitMQ connection closed.");
    } catch (error) {
      logger.error("Error in closing RabbitMQ connection: ", error);
    }
  }
}

export default new RabbitMQConnection();
