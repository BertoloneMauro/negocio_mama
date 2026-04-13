import mongoose from "mongoose";

const saleSchema = new mongoose.Schema(
  {
    kind: {
      type: String,
      enum: ["SALE", "REFUND"],
      default: "SALE"
    },

    // Venta anulada (queda registrada pero NO cuenta)
    isVoided: {
      type: Boolean,
      default: false
    },
    voidedAt: Date,
    voidedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    voidReason: { type: String, trim: true, default: "" },

    // Si es devolución, referencia a la venta original
    refSale: { type: mongoose.Schema.Types.ObjectId, ref: "Sale" },

    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
        quantity: { type: Number, required: true }, // 👈 permitimos negativo para devoluciones
        price: { type: Number, required: true }
      }
    ],

    // ✅ NUEVO (compatibles con SALE y REFUND)
    subtotal: { type: Number, default: 0 }, // suma qty*price (puede ser negativo en REFUND)
    discountPercent: { type: Number, default: 0, min: -100, max: 100 },
    discountAmount: { type: Number, default: 0 }, // puede ser negativo en REFUND

    total: { type: Number, required: true },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" , required: true }
  },
  { timestamps: true }
);

export default mongoose.model("Sale", saleSchema);
