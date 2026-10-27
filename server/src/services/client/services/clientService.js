import AppError from "../../../shared/utils/AppError.js";
import logger from "../../../shared/config/logger.js";
import {
  APPLICATION_ROLES,
  isValidClientRole,
} from "../../../shared/constants/roles.js";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";

/**
 * ClientService class handles the business logic related to clients
 * It is responsible for creating clients, managing client users, handling API keys for clients
 * It interacts with client repo, API key repo, user repo to perform these operations
 */
export class ClientService {
  /**
   *
   * @param {Object} dependencies - An object containing all required dependencies
   * @param {Object} dependencies.clientRepository - The client repo instance
   * @param {Object} dependencies.apiKeyRepository - The API key repo instance
   * @param {Object} dependencies.userRepository - The user repo instance
   * @throws will throw error if any of the required dependencies are missing
   */
  constructor(dependencies) {
    if (!dependencies) {
      throw new Error("Dependeicies are required");
    }

    if (!dependencies.clientRepository) {
      throw new Error("Dependencies are required");
    }

    if (!dependencies.apiKeyRepository) {
      throw new Error("ApiKeyRepository is required");
    }

    if (!dependencies.userRepository) {
      throw new Error("UserRepository is required");
    }
    // assigning dependencies to instance variables
    this.clientRepository = dependencies.clientRepository;
    this.apiKeyRepository = dependencies.apiKeyRepository;
    this.userRepository = dependencies.userRepository;
  }

  /**
   * Formats client object for response by removing sensitive information
   * @param {Object} user - The client user object
   * @returns {Object} - The formatted client user object
   */
  formatClientForResponse(user) {
    const userObj = user.toObject ? user.toObject() : { ...user };
    delete userObj.password;
    return userObj;
  }

  /**
   * Generates unique slug from name
   * @param {String} name - the name to generate the slug from
   * @returns {String} - the generated slug
   */
  generateSlug(name) {
    // google cloud platform --> google-cloud-platform
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  }

  /**
   * Creates a new client
   * @param {Object} clientData - the client data
   * @param {Object} adminUser - the admin user creating new client
   * @returns {Object} - the created client
   */
  async createClient(clientData, adminUser) {
    try {
      const { name, email, description, website } = clientData;

      const slug = this.generateSlug(name);

      if (!slug) {
        throw new AppError("Invalid client name", 400);
      }

      const existingClient = await this.clientRepository.findBySlug(slug);

      if (existingClient) {
        throw new AppError(`Client with slug ${slug} already exists`, 400);
      }

      const client = await this.clientRepository.create({
        name,
        slug,
        email,
        description,
        website,
        createdBy: adminUser.userId,
      });

      return client;
    } catch (error) {
      logger.error("Error creating client: ", error);
      throw error;
    }
  }

  /**
   * Check if the user has access to a specific client
   * @param {Object} user - the usser object
   * @param {String} clientId - The client ID
   * @returns {Boolean} - True if the user has access, false otherwise
   */
  canUserAccessClient(user, clientId) {
    if (!user || !clientId) {
      return false;
    }

    if (user.role === APPLICATION_ROLES.SUPER_ADMIN) {
      return true;
    }

    if (!user.clientId) {
      return false;
    }

    return user.clientId.toString() === clientId.toString();
  }

  /**
   * Create a new client user for a specific client
   * @param {String} clientId - The client ID
   * @param {Object} userData - the user data
   * @param {Object} adminUser - The admin user creating the client user
   * @returns {Object} - The created client user
   */
  async createClientUser(clientId, userData, adminUser) {
    try {
      const client = await this.clientRepository.findById(clientId);

      if (!client) {
        throw new AppError("Client not found", 404);
      }

      if (!this.canUserAccessClient(adminUser, clientId)) {
        throw new AppError("Access Denied", 403);
      }

      const canManageUsers =
        adminUser.role === APPLICATION_ROLES.CLIENT_ADMIN ||
        adminUser.role === APPLICATION_ROLES.SUPER_ADMIN;
      if (!canManageUsers) {
        throw new AppError("Insufficient permissions to create users", 403);
      }

      const {
        username,
        email,
        password,
        role = APPLICATION_ROLES.CLIENT_VIEWER,
      } = userData;

      if (!isValidClientRole(role)) {
        throw new AppError("Invalid role for client user", 400);
      }

      // Set permission based on role
      let permissions = {
        canCreateApiKeys: false,
        canManageUsers: false,
        canViewAnalytics: true,
        canExportData: false,
      };

      // If role is client_admin, update permissions accordingly
      if (role === APPLICATION_ROLES.CLIENT_ADMIN) {
        permissions = {
          canCreateApiKeys: true,
          canManageUsers: true,
          canViewAnalytics: true,
          canExportData: true,
        };
      }

      const user = await this.userRepository.create({
        username,
        email,
        password,
        role,
        clientId,
        permissions,
      });

      logger.info("Client user created", {
        clientId,
        userId: user._id,
        role,
      });

      return this.formatClientForResponse(user);
    } catch (error) {
      logger.error("Error creating client user", error);
      throw error;
    }
  }

  /**
   * Generates a new API Key
   * @returns {String} - The generated API Key
   */
  generateApiKey() {
    const prefix = "apimon";
    const randomBytes = crypto.randomBytes(20).toString("hex");
    return `${prefix}_${randomBytes}`;
  }

  /**
   * Create a new API Key for a specific client
   * @param {String} clientId - The client ID
   * @param {Object} keyData - The API Key data
   * @param {Object} user - The user creating API key
   * @returns {Object} - The created API key
   */
  async createApiKey(clientId, keyData, user) {
    try {
      const client = await this.clientRepository.findById(clientId);

      if (!client) {
        throw new AppError("Client not found", 404);
      }

      if (!this.canUserAccessClient(user, clientId)) {
        throw new AppError("Access denied", 403);
      }

      if (
        !(
          user.role === APPLICATION_ROLES.SUPER_ADMIN ||
          user.role === APPLICATION_ROLES.CLIENT_ADMIN
        )
      ) {
        throw new AppError(
          "Access Denied - Only Super admin and client admin can create API keys",
          403,
        );
      }

      const { name, description, environment = "production" } = keyData;

      const keyId = uuidv4();
      const keyValue = this.generateApiKey();

      const apiKey = await this.apiKeyRepository.create({
        keyId,
        keyValue,
        clientId,
        name,
        description,
        environment,
        createdBy: user.userId,
      });

      return apiKey;
    } catch (error) {
      logger.error("Error creating API Keys", error);
      throw error;
    }
  }

  /**
   * Get all API keys for apecific client
   * @param {String} clientId  - The client ID
   * @param {Object} user - The user requesting the API keys
   * @returns {Array} - The list of API keys
   */
  async getClientApiKeys(clientId, user) {
    try {
      // logger.info("API key access check", {
      //   userId: user?.userId ?? null,
      //   role: user?.role ?? null,
      //   expectedSuperAdminRole: APPLICATION_ROLES.SUPER_ADMIN,
      //   isSuperAdmin: user?.role === APPLICATION_ROLES.SUPER_ADMIN,
      //   userClientId: user?.clientId?.toString() ?? null,
      //   requestedClientId: clientId?.toString() ?? null,
      // });

      if (!this.canUserAccessClient(user, clientId)) {
        throw new AppError("Access denied to this client", 403);
      }

      const apiKeys = await this.apiKeyRepository.findByClientId(clientId);

      const formattedResponse = apiKeys.map((key) => {
        const keyObj = key.toObject ? key.toObject() : key;
        delete keyObj.keyValue;
        return keyObj;
      });

      return formattedResponse;
    } catch (error) {
      logger.error("Error getting client API Keys", error);
      throw error;
    }
  }

  async getClientByApiKey(apiKey) {
    try {
      const key = await this.apiKeyRepository.findByKeyValue(apiKey);

      if (!key) {
        return null;
      }

      if (key.isExpired()) {
        return null;
      }

      // get populated client from the key
      const client = key.clientId;

      if (!client || !client.isActive) {
        return null;
      }

      return {
        client,
        apiKey: key,
      };
    } catch (error) {
      logger.error("Error finding client by API key", error);
      throw error;
    }
  }
}
