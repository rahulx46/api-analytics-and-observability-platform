import mongoose from "mongoose";

/**
 * MongoDB schema for client or orgzs
 * Each client represents a business or org usint the monitoring tool
 */

const clientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minLength: 2,
      maxLength: 100,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: /^[a-z0-9-]+$/,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      maxLength: 500,
      default: "",
    },
    website: {
      type: String,
      default: "",
    },
    createdBy: { // User who created this client organization
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    settings: { // Client-specific observability and alerting configuration
      dataRetentionDays: {
        type: Number,
        default: 30,
        min: 7,
        max: 365,
      },
      alertsEnabled: {
        type: Boolean,
        default: true,
      },
      timezone: {
        type: String,
        default: "UTC",
      },
    },
  },
  {
    timestamps: true,
    collection: "clients",
  },
);

clientSchema.index({ isActive: 1 });

const Client = mongoose.model("Client", clientSchema);

export default Client;
