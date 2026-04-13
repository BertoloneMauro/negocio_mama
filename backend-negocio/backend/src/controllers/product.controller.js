import Product from "../models/Product.js";
import StockMovement from "../models/StockMovement.js";

const normalizeBarcode = (value) => {
  if (value === undefined) return undefined; // no vino en body
  const b = String(value || "").trim();
  return b ? b : ""; // "" significa "borrar"
};

export const createProduct = async (req, res, next) => {
  try {
    const barcodeNorm = normalizeBarcode(req.body.barcode);

    const product = new Product({
      ...req.body,
      // si barcodeNorm === "" => no guardamos nada (campo ausente)
      ...(barcodeNorm ? { barcode: barcodeNorm } : {}),
      createdBy: req.user.id
    });

    await product.save();
    res.status(201).json(product);
  } catch (error) {
    // duplicado de barcode
    if (error?.code === 11000 && error?.keyPattern?.barcode) {
      return res.status(400).json({ message: "Ese código de barras ya existe" });
    }
    next(error);
  }
};

export const getProducts = async (req, res, next) => {
  try {
    const products = await Product.find({ isActive: true })
      .populate("category", "name")
      .populate("createdBy", "email");

    res.json(products);
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (req, res, next) => {
  try {
    const updates = { ...req.body };

    // ✅ barcode: si viene vacío => borrar; si viene => trim
    const barcodeNorm = normalizeBarcode(updates.barcode);

    let query = updates;

    if (barcodeNorm !== undefined) {
      delete updates.barcode;

      if (barcodeNorm === "") {
        // borrar barcode
        query = { $set: updates, $unset: { barcode: 1 } };
      } else {
        query = { $set: { ...updates, barcode: barcodeNorm } };
      }
    }

    const product = await Product.findByIdAndUpdate(req.params.id, query, {
      new: true,
      runValidators: true
    });

    if (!product) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    res.json(product);
  } catch (error) {
    if (error?.code === 11000 && error?.keyPattern?.barcode) {
      return res.status(400).json({ message: "Ese código de barras ya existe" });
    }
    next(error);
  }
};

export const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    res.json({ message: "Producto desactivado" });
  } catch (error) {
    next(error);
  }
};

export const updateStock = async (req, res, next) => {
  try {
    const { amount } = req.body;

    if (amount === undefined) {
      return res.status(400).json({ message: "Cantidad requerida" });
    }

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    const newStock = product.stock + amount;

    if (newStock < 0) {
      return res.status(400).json({ message: "Stock insuficiente" });
    }

    product.stock = newStock;
    await product.save();

    res.json(product);
  } catch (error) {
    next(error);
  }
};

export const getLowStockProducts = async (req, res, next) => {
  try {
    const products = await Product.find({
      $expr: { $lte: ["$stock", "$minStock"] }
    }).populate("category", "name");

    res.json(products);
  } catch (error) {
    next(error);
  }
};

export const adjustStock = async (req, res, next) => {
  try {
    const { quantity } = req.body;

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    const stockBefore = product.stock;
    product.stock += quantity;
    await product.save();

    await StockMovement.create({
      product: product._id,
      type: quantity >= 0 ? "IN" : "OUT",
      reason: "ADJUSTMENT",
      quantity: Math.abs(quantity),
      stockBefore,
      stockAfter: product.stock,
      createdBy: req.user.id
    });

    res.json(product);
  } catch (error) {
    next(error);
  }
};
