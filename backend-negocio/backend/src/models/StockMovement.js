import mongoose from "mongoose";

const stockMovementSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true
    },
    type: {
      type: String,
      enum: ["IN", "OUT"],
      required: true
    },
    reason: {
      type: String,
      enum: ["SALE", "PURCHASE", "ADJUSTMENT", "RETURN"],
      required: true
    },
    quantity: {
      type: Number,
      required: true
    },
    stockBefore: {
      type: Number,
      required: true
    },
    stockAfter: {
      type: Number,
      required: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  { timestamps: true }
);

export default mongoose.model("StockMovement", stockMovementSchema);
