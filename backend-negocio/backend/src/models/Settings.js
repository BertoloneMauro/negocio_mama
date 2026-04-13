import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    storeName: { type: String, default: "Mi Negocio" },
    storeAddress: { type: String, default: "" },
    storePhone: { type: String, default: "" },

    receiptWidthMm: { type: Number, default: 80 }, // 80 o 58

    // Cómo mostrar “cajero” en ticket
    cashierLabelMode: {
      type: String,
      enum: ["none", "role", "email", "custom"],
      default: "role",
    },
    cashierCustomLabel: { type: String, default: "Caja" },
  },
  { timestamps: true }
);

export default mongoose.model("Settings", settingsSchema);
