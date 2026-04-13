import Sale from "../models/Sale.js";
import Product from "../models/Product.js";
import StockMovement from "../models/StockMovement.js";
import CashClosure from "../models/CashClosure.js"; // ✅ para bloquear si el día ya está cerrado


const round2 = (n) => Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;

export const createSale = async (req, res, next) => {
  try {
    const { items, discountPercent = 0 } = req.body;
    console.log("🔍 DEBUG createSale:");
    console.log("  items:", items);
    console.log("  discountPercent:", discountPercent, "| tipo:", typeof discountPercent);

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "La venta no tiene productos" });
    }

const disc = Number(discountPercent || 0);
console.log("  disc (después de Number()):", disc, "| isFinite?", Number.isFinite(disc));

if (!Number.isFinite(disc) || disc < -100 || disc > 100) {
      return res.status(400).json({ 
        message: "discountPercent inválido (-100 a 100)",
        received: discountPercent,
        parsed: disc
      });
    }
// Log para debug
console.log('🔍 discountPercent recibido:', discountPercent, 'tipo:', typeof discountPercent);
console.log('🔍 disc después de Number():', disc, 'isFinite?', Number.isFinite(disc));

if (!Number.isFinite(disc) || disc < -100 || disc > 100) {
  return res.status(400).json({ 
    message: "discountPercent inválido (-100 a 100)",
    received: discountPercent,
    parsed: disc
  });
}

    let subtotal = 0;
    const normalized = [];

    // Validar stock y preparar items con precio real
    for (const it of items) {
      const product = await Product.findById(it.product);
      if (!product || !product.isActive) {
        return res.status(404).json({ message: "Producto no disponible" });
      }

      const qty = Number(it.quantity);
      if (!Number.isFinite(qty) || qty <= 0) {
        return res.status(400).json({ message: "Cantidad inválida" });
      }

      if (product.stock < qty) {
        return res.status(400).json({ message: `Stock insuficiente para ${product.name}` });
      }

      const price = Number(product.price || 0);
      subtotal += qty * price;

      normalized.push({
        product: product._id,
        quantity: qty,
        price
      });
    }

    subtotal = round2(subtotal);
    const discountAmount = round2(subtotal * (disc / 100));
    const total = round2(subtotal - discountAmount);

    // Descontar stock + registrar movimientos
    for (const it of normalized) {
      const product = await Product.findById(it.product);

      const stockBefore = product.stock;
      product.stock -= it.quantity;
      await product.save();

      await StockMovement.create({
        product: product._id,
        type: "OUT",
        reason: "SALE",
        quantity: Math.abs(it.quantity),
        stockBefore,
        stockAfter: product.stock,
        createdBy: req.user.id
      });
    }

    const sale = await Sale.create({
      kind: "SALE",
      isVoided: false,
      items: normalized,
      subtotal,
      discountPercent: disc,
      discountAmount,
      total,
      createdBy: req.user.id
    });

    res.status(201).json(sale);
  } catch (e) {
    next(e);
  }
};




// 🔹 Todas las ventas
export const getSales = async (req, res, next) => {
  try {
    const sales = await Sale.find()
      .populate("items.product", "name")
      .populate("createdBy", "username")
      .sort({ createdAt: -1 });

    res.json(sales);
  } catch (error) {
    next(error);
  }
};






const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);

const parseLocalYMD = (ymd) => {
  const [y, m, dd] = String(ymd).split("-").map(Number);
  return new Date(y, m - 1, dd, 0, 0, 0, 0);
};

export const getTodaySales = async (req, res, next) => {
  try {
    const start = startOfDay(new Date());
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const sales = await Sale.find({
      createdAt: { $gte: start, $lt: end },
      isVoided: { $ne: true }
    })
      .populate("items.product", "name barcode")
      .populate("createdBy", "email")
      .sort({ createdAt: -1 });

    const totalAmount = sales.reduce((acc, s) => acc + Number(s.total || 0), 0);

    const totalItems = sales.reduce(
      (sum, s) => sum + (s.items || []).reduce((a, it) => a + Number(it.quantity || 0), 0),
      0
    );

    res.json({ totalSales: sales.length, totalAmount, totalItems, sales });
  } catch (e) {
    next(e);
  }
};





export const getSalesByDateRange = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) return res.status(400).json({ message: "from y to son requeridos (YYYY-MM-DD)" });

    const start = parseLocalYMD(from);
    const end = parseLocalYMD(to);
    end.setDate(end.getDate() + 1);

    const sales = await Sale.find({
      createdAt: { $gte: start, $lt: end },
      isVoided: { $ne: true }
    })
      .populate("items.product", "name barcode")
      .populate("createdBy", "email")
      .sort({ createdAt: -1 });

    const totalAmount = sales.reduce((acc, s) => acc + Number(s.total || 0), 0);
    const totalItems = sales.reduce(
      (sum, s) => sum + (s.items || []).reduce((a, it) => a + Number(it.quantity || 0), 0),
      0
    );

    res.json({ totalSales: sales.length, totalAmount, totalItems, sales });
  } catch (e) {
    next(e);
  }
};


export const voidSale = async (req, res, next) => {
  try {
    const sale = await Sale.findById(req.params.id);
    if (!sale) return res.status(404).json({ message: "Venta no encontrada" });
    if (sale.isVoided) return res.status(400).json({ message: "La venta ya está anulada" });

    // bloquear si el día ya fue cerrado
    const day = startOfDay(new Date(sale.createdAt));
    const closed = await CashClosure.findOne({ date: day });
    if (closed) return res.status(400).json({ message: "No se puede anular: el día ya está cerrado" });

    // devolver stock
    for (const it of sale.items || []) {
      const product = await Product.findById(it.product);
      if (!product) continue;

      const qty = Math.abs(Number(it.quantity || 0));

      const stockBefore = product.stock;
      product.stock += qty;
      await product.save();

      await StockMovement.create({
        product: product._id,
        type: "IN",
        reason: "RETURN",
        quantity: qty,
        stockBefore,
        stockAfter: product.stock,
        createdBy: req.user.id
      });
    }

    sale.isVoided = true;
    sale.voidedAt = new Date();
    sale.voidedBy = req.user.id;
    sale.voidReason = String(req.body?.reason || "").trim();
    await sale.save();

    res.json({ message: "Venta anulada", sale });
  } catch (e) {
    next(e);
  }
};


export const refundSale = async (req, res, next) => {
  try {
    const original = await Sale.findById(req.params.id);
    if (!original) return res.status(404).json({ message: "Venta no encontrada" });
    if (original.isVoided) return res.status(400).json({ message: "No se puede devolver: está anulada" });
    if (original.kind !== "SALE") return res.status(400).json({ message: "Solo se puede devolver una venta (SALE)" });

    // bloquear si el día ya fue cerrado
    const day = startOfDay(new Date(original.createdAt));
    const closed = await CashClosure.findOne({ date: day });
    if (closed) return res.status(400).json({ message: "No se puede devolver: el día ya está cerrado" });

    // evitar doble devolución completa
    const already = await Sale.findOne({ kind: "REFUND", refSale: original._id, isVoided: { $ne: true } });
    if (already) return res.status(400).json({ message: "Ya existe una devolución para esta venta" });

    // items negativos + restock
    const refundItems = [];
    for (const it of original.items || []) {
      const product = await Product.findById(it.product);
      if (!product) continue;

      const qtyPos = Math.abs(Number(it.quantity || 0));
      const price = Number(it.price || 0);

      const stockBefore = product.stock;
      product.stock += qtyPos;
      await product.save();

      await StockMovement.create({
        product: product._id,
        type: "IN",
        reason: "RETURN",
        quantity: qtyPos,
        stockBefore,
        stockAfter: product.stock,
        createdBy: req.user.id
      });

      refundItems.push({
        product: product._id,
        quantity: -qtyPos,
        price
      });
    }

    // ✅ calcular subtotal/discount/total del refund en base a la original (para que total sea -original.total)
    const origSubtotal =
      Number.isFinite(Number(original.subtotal)) && Number(original.subtotal) !== 0
        ? Number(original.subtotal)
        : (original.items || []).reduce(
            (acc, it) => acc + Math.abs(Number(it.quantity || 0)) * Number(it.price || 0),
            0
          );

    const disc = Number(original.discountPercent || 0);
    const origDiscount =
      Number.isFinite(Number(original.discountAmount)) ? Number(original.discountAmount) : round2(origSubtotal * (disc / 100));

    const subtotal = round2(-Math.abs(origSubtotal));
    const discountAmount = round2(-Math.abs(origDiscount));
    const total = round2(subtotal - discountAmount); // -subtotal + descuento => queda -total original

    const refund = await Sale.create({
      kind: "REFUND",
      refSale: original._id,
      isVoided: false,
      items: refundItems,
      subtotal,
      discountPercent: disc,
      discountAmount,
      total, // negativo
      createdBy: req.user.id,
      voidReason: String(req.body?.reason || "").trim()
    });

    res.status(201).json({ message: "Devolución registrada", refund });
  } catch (e) {
    next(e);
  }
};
