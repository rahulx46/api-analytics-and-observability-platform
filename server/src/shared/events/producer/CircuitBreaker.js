/**
 * Enum for circuit breaker states.
 * @readonly
 * @enum {string}
 */
export const CircuitState = Object.freeze({
  CLOSED: "CLOSED",
  OPEN: "OPEN",
  HALF_OPEN: "HALF_OPEN",
});

/**
 * A simple implementation of circuit breaker pattern in JS.
 * This class allows you to wrap calls to external services & automatically handle failures by opening the circuit after some failures, then allows a limited no. of test requests after a cooldown period to findout if the service has recovered.
 *
 * Usage:
 * const circuitBreaker = new CircuitBreaker({ failureThreshold: 5, cooldownMs: 30000 })
 * circuitBreaker.allowRequest() - returns true if req is allowed, false if circuit is OPEN
 * circuitBreaker.onSuccess() - call this when a req succeeds
 * circuitBreaker.onFailure() - call this if a req fails
 *
 * The circuitBreaker will automatically transition between states (CLOSED, OPEN, HALF_OPEN), based on success & failure of req and, will log state changes and metrics for monitoring purposes.
 */
export class CircuitBreaker {
  /**
   * Creates a new circuitBreaker instance with specified options.
   * @param {Objects} opts - Config options for circuitBreaker
   * @param {number} [opts.failureThreshold=5] - The no. of consecutive failures before circuit opens.
   * @param {number} [opts.cooldownMs=30000] - The cooldown period in milliseconds before allowing a test req.
   * @param {number} [halfOpenMaxAttempts=3] - The maximim no. of test req allowed in HALF_OPEN state.
   * @param {Object} [opts.logger=console] - The logger for logging circuitBreaker events.
   */
  constructor(opts = {}) {
    this.failureThreshold = opts.failureThreshold ?? 5;
    this.cooldownMs = opts.cooldownMs ?? 30_000;
    this.halfOpenMaxAttempts = opts.halfOpenMaxAttempts ?? 3;
    this.logger = opts.logger ?? console;

    this._state = CircuitState.CLOSED;
    this._failures = 0;
    this._lastFailureTime = 0;
    this._halfOpenAttempts = 0;
    this._halfOpenSuccesses = 0;
  }

  // some helper methods

  /**
   * Checks if cooldown period has elapsed since the last failure event.
   * @returns {boolean} True if cooldown period has elapsed, false if not.
   */
  _cooldownElapsed() {
    return Date.now() - this._lastFailureTime >= this.cooldownMs;
  }

  /**
   * Transitions the circuitBreaker to A new state
   * @param {CircuitState} newState - The new state to transition to.
   * @private
   */
  _transitionTo(newState) {
    const prev = this._state;
    this._state = newState;

    this.logger.info(`[CircuitBreaker] ${prev} => ${newState}`);

    if (newState === CircuitState.HALF_OPEN) {
      this._halfOpenAttempts = 0;
      this._halfOpenSuccesses = 0;
      this.logger.info(`[CircuitBreaker] ${prev} => HALF_OPEN`);
    }
  }

  /**
   * Opens the circuit, preventing furthe req from being allowed until cooldown period has elapsed.
   * This method is called when failureThreshold is reached or when a test req in HALF_OPEN state fails.
   * @private
   */
  _openCircuit() {
    this._lastFailureTime = Date.now();
    this._transitionTo(CircuitState.OPEN);
    this.logger.error("[CircuitBreaker] OPEN", {
      failures: this._failures,
      cooldownMs: this.cooldownMs,
    });
  }

  /**
   * Resets circuitBreaker to CLOSED state, allowing req to be processed normally.
   * @private
   */
  _reset() {
    this._state = CircuitState.CLOSED;
    this._failures = 0;
    this._halfOpenAttempts = 0;
    this._halfOpenSuccesses = 0;
    this.logger.info("[CircuitBreaker] HALF_OPEN => CLOSED");
  }

  /**
   * Gets current state of circuitBreaker.
   * @returns {CircuitState} The current state of circuitBreaker.
   */
  get state() {
    if (this._state === CircuitState.OPEN && this._cooldownElapsed()) {
      this._transitionTo(CircuitState.HALF_OPEN);
    }

    return this._state;
  }

  /**
   * Determines if a req is allowed based on current state of circuitBreaker
   * @returns {boolean} True if req is allowed, false otherwise.
   */
  allowRequest() {
    const current = this.state;

    this.logger.debug("[CircuitBreaker] allowRequest check", {
      state: current,
      halfOpenAttempts: this._halfOpenAttempts,
      halfOpenMaxAttempts: this.halfOpenMaxAttempts,
      halfOpenSuccesses: this._halfOpenSuccesses,
      failures: this._failures,
    });

    // In CLOSED state, all req are allowed.
    if (current === CircuitState.CLOSED) return true;

    // In OPEN stare, no req are allowed until cooldown has elapsed, then it transitions to HALF_OPEN.
    if (current === CircuitState.HALF_OPEN) {
      if (this._halfOpenAttempts < this.halfOpenMaxAttempts) {
        this._halfOpenAttempts++;
        this.logger.info(
          `[CircuitBreaker] allowing HALF_OPEN attempt (${this._halfOpenAttempts}/${this.halfOpenMaxAttempts})`,
        );
        return true;
      }
      this.logger.warn(
        `[CircuitBreaker] HALF_OPEN attempts exhausted (${this._halfOpenAttempts}/${this.halfOpenMaxAttempts})`,
      );
      return false;
    }
    this.logger.info(`[CircuitBreaker] rejecting request, state: ${current}`);

    // In OPEN state, reject all req until cooldown has elapsed.
    return false;
  }

  /**
   * Records a successful req.
   * If circuitBreaker is in HALF_OPEN state, it counts succcess and transitions to CLOSED if req. no. of successful attempts is reached.
   * If circuitBreaker is in CLOSED state and there were prev. failures, it resets the failure count.
   * @returns {void}
   */
  onSuccess() {
    this.logger.info("[CircuitBreaker] success recorded", {
      state: this._state,
      halfOpenSuccesses: this._halfOpenSuccesses,
      halfOpenMaxAttempts: this.halfOpenMaxAttempts,
      failures: this._failures,
    });

    if (this._state === CircuitState.HALF_OPEN) {
      this._halfOpenSuccesses++;
      this.logger.info(
        `[CircuitBreaker] HALF_OPEN success ${this._halfOpenSuccesses}/${this.halfOpenMaxAttempts}`,
      );
      if (this._halfOpenSuccesses >= this.halfOpenMaxAttempts) {
        this._reset();
        this.logger.info(
          "[CircuitBreaker] reset to CLOSED after successful half-open probes",
        );
      }
      return;
    }

    if (this._failures > 0) {
      this._failures = 0;
      this.logger.info("[CircuitBreaker] failure counter reset after success");
    }
  }

  /**
   * Records a failed req. If the circuitBreaker is in HALF_OPEN state, it immediately transitions back to OPEN.
   * If circuitBreaker is in CLOSED state, it increments the failure count & opens the circuit if failureThreshold is reached.
   * @returns
   */
  onFailure() {
    this.logger.error("[CircuitBreaker] failure recorded", {
      state: this._state,
      failures: this._failures,
      failureThreshold: this.failureThreshold,
    });

    // If a failure occurs in HALF_OPEN state, it immediately transitions back to OPEN
    if (this._state === CircuitState.HALF_OPEN) {
      this.logger.warn("[CircuitBreaker] half-open failed, reopening circuit");
      this._openCircuit();
      return;
    }

    this._failures++;
    this._lastFailureTime = Date.now();

    this.logger.info(
      `[CircuitBreaker] failure count: ${this._failures}/${this.failureThreshold}`,
    );
    if (this._failures >= this.failureThreshold) {
      this._openCircuit();
    }
  }

  /**
   * Returns a snapshot of current state of circuitBreaker.
   * @returns {{
   *       state: string,
   *       failures: number,
   *       lastFailureTime: number,
   *       halfOpenAttempts: number,
   *       halfOpenSuccesses: number,
   *       cooldownMs: number,
   *       failureThreshold: number}} - The snapshot of the circuitBreaker state.
   * @private
   */
  snapshot() {
    return {
      state: this.state,
      failures: this._failures,
      lastFailureTime: this._lastFailureTime,
      halfOpenAttempts: this._halfOpenAttempts,
      halfOpenSuccesses: this._halfOpenSuccesses,
      cooldownMs: this.cooldownMs,
      failureThreshold: this.failureThreshold,
    };
  }
}
