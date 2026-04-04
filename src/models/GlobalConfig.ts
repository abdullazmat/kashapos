import mongoose from "mongoose";

const globalConfigSchema = new mongoose.Schema({
  platformName: { type: String, default: "KashaPOS" },
  supportEmail: {
    type: String,
    default: () => process.env.SUPPORT_EMAIL?.trim() || "",
  },
  defaultCurrency: { type: String, default: "UGX" },
  taxEngine: { type: String, default: "URA EFRIS" },

  // Feature Flags
  featureFlags: {
    offlineMode: { type: Boolean, default: true },
    efrisIntegration: { type: Boolean, default: true },
    mobileAppAccess: { type: Boolean, default: false },
    aiSalesAssistant: { type: Boolean, default: false },
    publicApiAccess: { type: Boolean, default: true },
    maintenanceMode: { type: Boolean, default: false },
  },

  // Gateway Status
  gateways: {
    whatsapp: { type: String, default: "Twilio Verified" },
    sms: { type: String, default: "Africa's Talking" },
  },

  updatedAt: { type: Date, default: Date.now },
});

const GlobalConfig =
  mongoose.models.GlobalConfig ||
  mongoose.model("GlobalConfig", globalConfigSchema);
export default GlobalConfig;
