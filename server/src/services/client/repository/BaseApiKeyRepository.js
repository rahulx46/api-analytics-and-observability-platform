/**
 * This class defines the interface for API Key repo implementations
 * It provides method signatures for creating API keys, finding API keys by value, and finding/ counting API keys by client ID
 * It serves as a base class for specific DB implementations of the API key repo
 * Each method throws an error indicating that any repository that inherits this method must provide its own implementation
 */
export default class BaseApiKeyRepository {
  /**
   * Constructor for BaseApiKeyRepository
   * @param {*} model - The mongoose model for API key
   */
  constructor(model) {
    this.model = model;
  }

  async create(apiKeyData) {
    throw new Error("Method not implemented");
  }

  async findByKeyValue(keyValue, includeInactive) {
    throw new Error("Method not implemented");
  }

  async findByClientId(clientId, filters) {
    throw new Error("Method not implemented");
  }

  async countByClientId(clientId, filters) {
    throw new Error("Method not implemented");
  }
}
