import AppError from "../../../shared/utils/AppError.js";
import jwt from "jsonwebtoken";
import logger from "../../../shared/config/logger.js";
import config from "../../../shared/config/index.js";
import bcrypt from "bcryptjs";

export class AuthService {
  constructor(userRepository) {
    if (!userRepository) {
      throw new Error("UserRepository is Required.");
    }

    this.userRepository = userRepository;
  }

  generateToken(user) {
    const { _id, email, username, role, clientId } = user;

    const payload = {
      userId: _id,
      username,
      email,
      role,
      clientId,
    };

    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });
  }

  formatUserForResponse(user) {
    const userObj = user.toObject ? user.toObject() : { ...user };
    delete userObj.password;
    return userObj;
  }

  async comparePassword(userEnteredPassword, hashedPassword) {
    return await bcrypt.compare(userEnteredPassword, hashedPassword);
  }

  async onboardSuperAdmin(superAdminData) {
    try {
      const existingUser = await this.userRepository.findAll();

      if (existingUser && existingUser.length > 0) {
        throw new AppError("Super Admin onboarding is disabled", 403);
      }

      const user = await this.userRepository.create(superAdminData);
      const token = this.generateToken(user);

      logger.info("Admin onboarded successfully", {
        username: user.username,
      });

      return {
        user: this.formatUserForResponse(user),
        token,
      };
    } catch (error) {
      logger.error("Error in onboarding Super admin", error);
      throw error;
    }
  }

  async register(userData) {
    try {
      const existingUser = await this.userRepository.findByUsername(
        userData.username,
      );
      if (existingUser) {
        throw new AppError("Username already exists", 409);
      }

      const existingEmail = await this.userRepository.findByEmail(
        userData.email,
      );
      if (existingEmail) {
        throw new AppError("Email already exists", 409);
      }

      const user = await this.userRepository.create(userData);
      const token = this.generateToken(user);

      logger.info("User registered successfully", {
        username: user.username,
      });

      return {
        user: this.formatUserForResponse(user),
        token,
      };
    } catch (error) {
      logger.error("Error in Register service", error);
      throw error;
    }
  }

  async login(username, password) {
    try {
      const user = await this.userRepository.findByUsername(username);

      if (!user) {
        throw new AppError("Invalid Credentials", 401);
      }

      if (!user.isActive) {
        throw new AppError("Account is inactive/ deactivated", 403);
      }

      const isPasswordValid = await this.comparePassword(
        password,
        user.password,
      );

      if (!isPasswordValid) {
        throw new AppError("Invald Credentials", 401);
      }

      const token = this.generateToken(user);

      logger.info("User logged in succeccfully", { username: user.username });

      return {
        user: this.formatUserForResponse(user),
        token,
      };
    } catch (error) {
      logger.error("Error in login service", error);
      throw error;
    }
  }

  async getProfile(userId) {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new AppError("User not found", 404);
      }
      return this.formatUserForResponse(user);
    } catch (error) {
      logger.error("Error getting user profile: ", error);
      throw error;
    }
  }
}
