import MongoClientRepository from "../repository/ClientRepository.js";
import MongoApiKeyRepository from "../repository/ApiKeyRepository.js";
import MongoUserRepository from "../../auth/repository/UserRepository.js";
import { ClientService } from "../services/clientService.js";
import { ClientController } from "../controller/clientController.js";
import authContainer from "../../auth/Dependencies/dependencies.js";

/**
 * Container class to initialize and manage dependencies for client service
 * This class is responsible for creating instances of repositories, services, controllers
 * Ensures all dependencies are properly injected
 * Provides a centralized location for managing dependencies of client service, making it easier to maintain & scale the application
 */
class Container {
  /**
   * Initialize container by creating instances of repos, services, controllers
   * @returns {Object} - An object containing initialized repos, services, controllers
   */
  static init() {
    // Initialize repositories
    const repositories = {
      clientRepository: MongoClientRepository,
      apiKeyRepository: MongoApiKeyRepository,
      userRepository: MongoUserRepository,
    };

    // Initialize services with required dependencies
    const services = {
      clientServices: new ClientService({
        clientRepository: repositories.clientRepository,
        apiKeyRepository: repositories.apiKeyRepository,
        userRepository: repositories.userRepository,
      }),
    };

    // Initialize controllers with required dependencies
    const controller = {
      clientController: new ClientController(
        services.clientServices,
        authContainer.services.authService,
      ),
    };

    return { repositories, services, controller };
  }
}

const initialized = Container.init();
export { Container };
export default initialized;
