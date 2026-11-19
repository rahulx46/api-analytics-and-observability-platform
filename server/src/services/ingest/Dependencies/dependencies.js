import { createEventProducer } from "../../../shared/events/producer/createEventProducer.js";
import { IngestController } from "../controller/ingestController.js";
import { IngestService } from "../services/ingestServices.js";

/**
 * Container class for managing dependencies in ingest module.
 * This class initializes all necessary services and controllers for the ingest functionality, ensuring that all dependencies are properly injected.
 * The init method creates an instance of EventProducer, which is then passed to IngestService.
 * The IngestController is created with IngestService as its dependency. This approach allows for better modularity and separation of concerns, making it easier to manage, test the components of ingest module.
 */
class Container {
  /**
   * Initialized dependencies for ingest module. It creates an instance of EventProducer & injects it into IngestService, which is then injected into InjestController.
   * The method returns an object containing initialized services, controllers for use in the application.
   * @returns {{services: {ingestService: IngestService}, controllers: {ingestController: IngestController}}} - The initialized services and controllers.
   */
  static init() {
    const eventProducer = createEventProducer();

    const services = {
      ingestService: new IngestService({ eventProducer }),
    };

    const controllers = {
      ingestController: new IngestController(services),
    };

    return { services, controllers };
  }
}

// Initialize container and export services, controllers for use in the application.
const container = Container.init();
export default {
  ingestService: container.services.ingestService,
  ingestController: container.controllers.ingestController,
  Container,
};
