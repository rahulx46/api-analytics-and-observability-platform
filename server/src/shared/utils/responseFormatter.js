/**
 * ResponseFormatter - Utility class for formatting API response in a consistent structure
 * This class can be extended in future to include additional response types or features as needed
 */

class ResponseFormatter {
  /**
   * Formats a special response with optional data & message.
   * @param {any} - data: the data to include in response (default: null)
   * @param {string} - message: the message to include in the response (default: "Success")
   * @param {number} - statusCode: the HTTP status code for response (default: 200)
   * @returns {Object} - the formatted response object
   */
  static success(data = null, message = "Success", statusCode = 200) {
    return {
      success: true,
      message,
      data,
      statusCode,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Formats an error response with a message, status code, & optional error details
   * @param {string} - message: the error message to include in response (default: "Error")
   * @param {number} - statusCode: the HTTP status code for error response (default: 500)
   * @param {any} - error: Additional error details to include in response (default: null)
   * @returns {Object} - the formatted error response object
   */
  static error(message = "Error", statusCode = 500, error = null) {
    return {
      success: false,
      message,
      error,
      statusCode,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Formats a validation error response with optional error details
   * @param {any} - error: Additional error details to include in response (default: null)
   * @returns {Object} - the formatted validation error response object
   */
  static validationError(error = null) {
    return {
      success: false,
      message: "Validation failed",
      error,
      statusCode: 400,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Formats a paginated response with data & pagination details
   * @param {any} data: the data to include in response (default: null)
   * @param {number} page: current page number
   * @param {number} limit: number of items per page
   * @param {number} total: total number of items
   * @returns {Object} - the formatted paginated response object
   */
  static paginated(data = null, page, limit, total) {
    return {
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      timestamp: new Date().toISOString(),
    };
  }
}

export default ResponseFormatter;
