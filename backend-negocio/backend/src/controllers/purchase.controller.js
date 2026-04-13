import Purchase from "../models/Purchase.js";
import Product from "../models/Product.js";
import StockMovement from "../models/StockMovement.js";


export const createPurchase = async (req, res, next) => {
  try {
    const { items } = req.body;
    const supplier = String(req.body.supplier || "").trim();

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "La compra no tiene productos" });
    }

    let total = 0;

    // validar + calcular total
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product || !product.isActive) {
        return res.status(404).json({ message: "Producto no válido" });
      }

      const qty = Number(item.quantity);
      const cost = Number(item.cost);

      if (!Number.isFinite(qty) || qty <= 0) {
        return res.status(400).json({ message: "Cantidad inválida" });
      }
      if (!Number.isFinite(cost) || cost <= 0) {
        return res.status(400).json({ message: "Costo inválido" });
      }

      total += qty * cost;
    }

    // impactar stock + movimientos
    for (const item of items) {
      const product = await Product.findById(item.product);

      const qty = Number(item.quantity);

      const stockBefore = product.stock;
      product.stock += qty;
      await product.save();

      await StockMovement.create({
        product: product._id,
        type: "IN",
        reason: "PURCHASE",
        quantity: qty,
        stockBefore,
        stockAfter: product.stock,
        createdBy: req.user.id
      });
    }

    const purchase = new Purchase({
      items: items.map(it => ({
        product: it.product,
        quantity: Number(it.quantity),
        cost: Number(it.cost),
      })),
      supplier,
      total,
      createdBy: req.user.id
    });

    await purchase.save();
    res.status(201).json(purchase);
  } catch (error) {
    next(error);
  }
};




// helper para rangos por período
const getRangeByPeriod = (period = "today") => {
  const now = new Date();

  // end exclusivo: mañana 00:00
  const end = new Date(now);
  end.setHours(0, 0, 0, 0);
  end.setDate(end.getDate() + 1);

  if (period === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }

  if (period === "week") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 6);
    return { start, end };
  }

  if (period === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    return { start, end };
  }

  return null; // all
};

// ✅ GET /purchases?period=today|week|month|all
export const getPurchases = async (req, res, next) => {
  try {
    const period = String(req.query.period || "today");
    const range = getRangeByPeriod(period);

    const filter = range ? { createdAt: { $gte: range.start, $lt: range.end } } : {};

    const purchases = await Purchase.find(filter)
      .populate("items.product", "name barcode")
      .populate("createdBy", "username email")
      .sort({ createdAt: -1 });

    const totalAmount = purchases.reduce((acc, p) => acc + Number(p.total || 0), 0);
    const totalItems = purchases.reduce(
      (sum, p) => sum + (p.items || []).reduce((a, it) => a + Number(it.quantity || 0), 0),
      0
    );

    res.json({
      totalPurchases: purchases.length,
      totalAmount,
      totalItems,
      purchases,
    });
  } catch (e) {
    next(e);
  }
};

// ✅ GET /purchases/:id
export const getPurchaseById = async (req, res, next) => {
  try {
    const purchase = await Purchase.findById(req.params.id)
      .populate("items.product", "name barcode")
      .populate("createdBy", "username email");

    if (!purchase) return res.status(404).json({ message: "Compra no encontrada" });

    res.json(purchase);
  } catch (e) {
    next(e);
  }
};
