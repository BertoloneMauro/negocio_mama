import mongoose from "mongoose";

const purchaseSchema = new mongoose.Schema(
  {
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true
        },
        quantity: {
          type: Number,
          required: true,
          min: 1
        },
        cost: {
          type: Number,
          required: true
        }
      }
    ],

    // ✅ NUEVO: proveedor (opcional)
    supplier: {
      type: String,
      trim: true,
      default: ""
    },

    total: {
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

export default mongoose.model("Purchase", purchaseSchema);
