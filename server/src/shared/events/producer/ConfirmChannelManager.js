import { EventEmitter } from "node:events";

/**
 * Manages a single RabbitMQ confirmChannel, ensuring it is recreated if it closes or encounters an error.
 * Provides a getChannel() method that returns a promise which resolve to a ready-to-use confirmChannel.
 * If the channel is currently being established, additional calls to getChannel() will wait for same channel to be ready.
 * Emits 'drain' event when the channel's write buffer is drained, 'error' event if channel encounters an error.
 */
export class ConfirmChannelManager extends EventEmitter {
  /**
   *
   * @param {{ rabbitmq: any, logger?: any }} param0 - config object containing RabbitMQ connection manager and an optional logger.
   * @throws - Will throw an error if RabbitMQ connection manager is not provided.
   */
  constructor({ rabbitmq, logger }) {
    super();

    if (!rabbitmq)
      throw new Error(
        "Confirm Channel Manager requires rabbitmq connection manager",
      );

    this._rabbitmq = rabbitmq;
    this._logger = logger ?? console;
    this._channel = null;
    this._connecting = false;
    this._connectWaiters = [];
  }

  /**
   * Returns a promise that resolves to a RabbitMQ confirmChannel. If channel is already established, it returns it immediately.
   * If channel is in process of being established, it waits for that process to complete, then returns the channel.
   * If no channel exists and one is not currently being established, it initiates creation of a new confirmChannel.
   * @returns {Promise<any>} - A promise that resolvesto a RabbitMQ confirm channel.
   * @throws Will throw an error if channel cannot be established after retrying.
   */
  async getChannel() {
    if (this._channel) return this._channel;

    if (this._connecting) {
      return new Promise((resolve, reject) => {
        this._connectWaiters.push({ resolve, reject });
      });
    }
    return this._connect();
  }

  /**
   * Establishes a new RabbitMQ confirmChannel. If channel is already being established, it waits for the process to be completed.
   * If channel is successfully established, it resolves any pending promises waiting for channel.
   * If an error occurs during channel creation, it rejects any pending promises and throws an error.
   * @returns {Promise<any>} Apromise that resolves to a RabbitMQ confirmChannel.
   * @throws will throw an error if channel cannot be established.
   */
  async _connect() {
    this._connecting = true;
    try {
      let connection;

      if (this._rabbitmq.connection) {
        connection = this._rabbitmq.connection;
      } else {
        // ensure connection is established by calling connect()
        await this._rabbitmq.connect();

        if (!this._rabbitmq.connection) {
          throw new Error("Failed to obtain RabbitMQ connection");
        }

        connection = this._rabbitmq.connection;
      }

      // Create a confirm channel
      const confirmChannel = await connection.createConfirmChannel();

      // Listen for 'drain' event to handle back-pressure
      confirmChannel.on("drain", () => this.emit("drain"));

      confirmChannel.on("close", () => {
        this._logger.error(
          "[ChannelManager] confirm channel closed unexpectedly",
        );
        this._channel = null;
      });

      confirmChannel.on("error", (err) => {
        this._logger.error("[ChannelManager] confirm channel error", {
          error: err.message,
          stack: err.stack,
          code: err.code,
        });
        this._channel = null;
        this.emit("error", err);
      });

      this._channel = confirmChannel;
      this._logger.info("[ChannelManager] confirm channel ready");

      for (const w of this._connectWaiters) w.resolve(confirmChannel);
      this._connectWaiters = [];

      return confirmChannel;
    } catch (error) {
      for (const w of this._connectWaiters) w.reject(error);
      this._connectWaiters = [];
      throw error;
    } finally {
      this._connecting = false;
    }
  }
}
