/**
 * This class defines the interface for client repo implementations
 * and provides method signatures  for creating clients, finding clients by ID or slug, finding/ counting clients based on filters
 * It serves as a base class for specific DB implementations of the client repo
 * Each method throws an error, indicating that subclasses must have their own implementation for these methods
 */

export default class BaseClientRepository {
  /**
   * Constructor for BaseClientRepository
   * @param {*} model - The Mongoose model for client
   */
  constructor(model) {
    this.model = model;
  }

  async create(clientData) {
    throw new Error("Method not implemented");
  }

  async findById(clientId) {
    throw new Error("Method not implemented");
  }

  async findBySlug(slug) {
    throw new Error("Method not implemented");
  }

  async find(filters, options) {
    throw new Error("Method not implemented");
  }

  async count(filters) {
    throw new Error("Method not implemented");
  }
}
