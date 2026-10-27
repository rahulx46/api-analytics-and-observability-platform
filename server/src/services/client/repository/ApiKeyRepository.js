import BaseApiKeyRepository from "./BaseApiKeyRepository.js";
import logger from "../../../shared/config/logger.js";
import ApiKey from "../../../shared/models/ApiKey.js";

/**
 * MongoApiKeyRepository class handles DB operations related to API keys
 * This class extends BaseApiKeyRepository and provides implementations for each method
 */
class MongoApiKeyRepository extends BaseApiKeyRepository {
  constructor() {
    super(ApiKey);
  }

  /**
   * Creates a new API key
   * @param {Object} apiKeyData - API key data
   * @returns {Promise<Object>}
   */
  async create(apiKeyData) {
    try {
      const apiKey = new this.model(apiKeyData);
      await apiKey.save();
      logger.info("API key created in DataBase", { keyId: apiKey.keyId });
      return apiKey;
    } catch (error) {
      logger.error("Error creating API Key in DB", error);
      throw error;
    }
  }

  /**
   * Find API key by key value
   * @param {string} keyValue - API key value
   * @param {boolean} includeInactive - Include inactive keys
   * @returns {Promise<Object | null>}
   */
  async findByKeyValue(keyValue, includeInactive = false) {
    try {
      const filter = { keyValue };
      if (!includeInactive) {
        filter.isActive = true;
      }

      const apiKey = await this.model.findOne(filter).populate("clientId");
      return apiKey;
    } catch (error) {
      logger.error("Error finding API key by value: ", error);
      throw error;
    }
  }

  /**
   * Find API Keys by Client ID
   * @param {string} clientId - Client ID
   * @param {Object} filters - Additional filters
   * @returns {Promise<Array>}
   */
  async findByClientId(clientId, filters = {}) {
    try {
      const query = { ...filters, clientId };
      const apiKeys = await this.model
        .find(query)
        .populate("createdBy", "username email")
        .sort({ createdAt: -1 });

      return apiKeys;
    } catch (error) {
      logger.error("Error finding API Keys by client ID", error);
      throw error;
    }
  }

  /**
   * Count API Keys by client ID
   * @param {string} clientId - client ID
   * @param {Object} filters - Additional filters
   * @returns {Promise<numbers>}
   */
  async countByClientId(clientId, filters = {}) {
    try {
      const query = { clientId, ...filters };
      const count = await this.model.countDocuments(query);
      return count;
    } catch (error) {
      logger.error("Error counting API Keys", error);
      throw error;
    }
  }
}

export default new MongoApiKeyRepository();
