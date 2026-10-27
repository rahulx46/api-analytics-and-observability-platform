import BaseClientRepository from "./BaseClientRepository.js";
import Client from "../../../shared/models/Client.js";
import logger from "../../../shared/config/logger.js";

/**
 * MongoClientRepository class handels DB operations related to clients
 * This class extends the BaseClientRepository and provides implementations for each method
 */

class MongoClientRepository extends BaseClientRepository {
  constructor() {
    super(Client);
  }

  /**
   * Creates a new client
   * @param {Object} clientData
   * @returns {Promise<Object>}
   */

  async create(clientData) {
    try {
      const client = new this.model(clientData);
      await client.save();

      logger.debug("Client created in MongoDB", {
        mongoId: client._id,
        slug: client.slug,
      });

      return client;
    } catch (error) {
      logger.error("Error creating client in DB", error);
      throw error;
    }
  }

  /**
   * Find client by ID
   * @param {string} clientId
   * @returns {Promise<Object|null>} - The client object or null if not found
   */
  async findById(clientId) {
    try {
      const client = await this.model.findById(clientId);

      logger.info("Client details from MongoDB", client);
      return client;
    } catch (error) {
      logger.error("Error finding client in DB by ID", error);
      throw error;
    }
  }

  /**
   * Find a client by slug
   * @param {string} slug - The slug of the client
   * @returns {Promise<Object|null>} - The client object or null if not found
   */
  async findBySlug(slug) {
    try {
      const client = await this.model.findOne({ slug });
      return client;
    } catch (error) {
      logger.error("Error finding client by slug", error);
      throw error;
    }
  }

  /**
   * Find clients with filters and pagination
   * @param {Object} filters - Query filters
   * @param {*} options - Query options (limits, skip, sort)
   * @returns {Promise<Object}
   */

  async find(filters = {}, options = {}) {
    try {
      const { limit = 50, skip = 0, sort = { createdAt: -1 } } = options;

      const clients = await this.model
        .find(filters)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select("-__v");

      return clients;
    } catch (error) {
      logger.error("Error finding clients", error);
      throw error;
    }
  }

  /**
   * Count clients matching filters
   * @param {Object} filters - Query filters
   * @returns {Promise<number>}
   */
  async count(filters = {}) {
    try {
      const count = await this.model.countDocuments(filters);
      return count;
    } catch (error) {
      logger.error("Error counting clients", error);
      throw error;
    }
  }
}

export default new MongoClientRepository();
