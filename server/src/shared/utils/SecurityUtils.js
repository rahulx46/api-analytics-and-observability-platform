class SecurityUtils {
  static PASSWORD_REQUIREMENTS = {
    minLength: parseInt(process.env.PASSWORD_MIN_LENGTH || "8"),
    requireUppercase:
      (process.env.PASSWORD_REQUIRE_UPPERCASE || "true") === "true",
    requireLowercase:
      (process.env.PASSWORD_REQUIRE_LOWERCASE || "true") === "true",
    requireNumbers: (process.env.PASSWORD_REQUIRE_NUMBERS || "true") === "true",
    requireSymbols: (process.env.PASSWORD_REQUIRE_SYMBOLS || "true") === "true",
  };

  /**
   *
   * @param {string} password
   * @returns {Object} - validaton res with success flag and errors
   */
  static validatePassword(password) {
    const errors = [];
    const requirements = this.PASSWORD_REQUIREMENTS;

    if (!password) {
      return {
        success: false,
        errors: ["Password is required."],
      };
    }

    if (password.length < requirements.minLength) {
      errors.push(
        `Password must be atleast ${requirements.minLength} chars long!`,
      );
    }

    if (requirements.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push("Password must contain atleast one uppercase letter.");
    }

    if (requirements.requireLowercase && !/[a-z]/.test(password)) {
      errors.push("Password must contain atleast one lowercase letter.");
    }

    if (requirements.requireNumbers && !/[0-9]/.test(password)) {
      errors.push("Password must contain atleast one number.");
    }

    if (requirements.requireSymbols && !/[^A-Za-z0-9]/.test(password)) {
      errors.push("Password must contain atleast one special character.");
    }

    // check for common weak passwords
    const weakPasswords = [
      "passwprd",
      "123456",
      "qwerty",
      "admin",
      "letmein",
      "password123",
      "admin123",
      "12345678",
      "welcome",
    ];

    if (weakPasswords.includes(password.toLowerCase())) {
      errors.push("Password is too common.");
    }

    return {
      success: errors.length === 0,
      errors,
      strenght: this.calculatePasswordStrength(password),
    };
  }
}
