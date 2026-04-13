import mongoose from "mongoose";

const cashClosureSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true, unique: true }, // guardada a 00:00 local

    totalSales: { type: Number, required: true },
    totalItems: { type: Number, required: true, default: 0 }, // ✅ NUEVO
    totalAmount: { type: Number, required: true },

    totalPurchases: { type: Number, required: true, default: 0 }, // ✅ NUEVO
    totalPurchaseAmount: { type: Number, required: true, default: 0 }, // ✅ NUEVO

    closedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

export default mongoose.model("CashClosure", cashClosureSchema);
