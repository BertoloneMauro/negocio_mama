import Sale from "../models/Sale.js";
import Purchase from "../models/Purchase.js";
import CashClosure from "../models/CashClosure.js";

const startOfToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
};

const parseLocalYMD = (ymd) => {
  const [y, m, d] = String(ymd).split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0); // LOCAL
};

const sumSaleUnits = (sales) =>
  sales.reduce((sum, s) => sum + (s.items || []).reduce((a, it) => a + Number(it.quantity || 0), 0), 0);

export const getTodayCash = async (req, res, next) => {
  try {
    const day = startOfToday();
    const end = new Date(day);
    end.setDate(end.getDate() + 1); // exclusive

    const [closure, sales, purchases] = await Promise.all([
      CashClosure.findOne({ date: day }).populate("closedBy", "email role"),
      Sale.find({ createdAt: { $gte: day, $lt: end } }),
      Purchase.find({ createdAt: { $gte: day, $lt: end } })
    ]);

    const totalSales = sales.length;
    const totalItems = sumSaleUnits(sales);
    const totalAmount = sales.reduce((acc, s) => acc + Number(s.total || 0), 0);

    const totalPurchases = purchases.length;
    const totalPurchaseAmount = purchases.reduce((acc, p) => acc + Number(p.total || 0), 0);

    res.json({
      date: day,
      isClosed: Boolean(closure),
      closure,
      sales: { totalSales, totalItems, totalAmount },
      purchases: { totalPurchases, totalPurchaseAmount }
    });
  } catch (err) {
    next(err);
  }
};

export const getClosuresByDateRange = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) {
      return res.status(400).json({ message: "from y to son requeridos (YYYY-MM-DD)" });
    }

    const start = parseLocalYMD(from);
    const end = parseLocalYMD(to);
    end.setDate(end.getDate() + 1); // exclusive

    const closures = await CashClosure.find({ date: { $gte: start, $lt: end } })
      .populate("closedBy", "email role")
      .sort({ date: -1 });

    // Totales del período
    const totals = closures.reduce(
      (acc, c) => {
        acc.days += 1;
        acc.totalSales += Number(c.totalSales || 0);
        acc.totalItems += Number(c.totalItems || 0);
        acc.totalAmount += Number(c.totalAmount || 0);
        acc.totalPurchases += Number(c.totalPurchases || 0);
        acc.totalPurchaseAmount += Number(c.totalPurchaseAmount || 0);
        return acc;
      },
      { days: 0, totalSales: 0, totalItems: 0, totalAmount: 0, totalPurchases: 0, totalPurchaseAmount: 0 }
    );

    res.json({ closures, totals });
  } catch (err) {
    next(err);
  }
};

export const closeDailyCash = async (req, res, next) => {
  try {
    const date = startOfToday();

    const alreadyClosed = await CashClosure.findOne({ date });
    if (alreadyClosed) {
      return res.status(400).json({ message: "La caja ya fue cerrada hoy" });
    }

    const end = new Date(date);
    end.setDate(end.getDate() + 1); // exclusive

    const [sales, purchases] = await Promise.all([
      Sale.find({ createdAt: { $gte: date, $lt: end } }),
      Purchase.find({ createdAt: { $gte: date, $lt: end } })
    ]);

    const totalSales = sales.length;
    const totalItems = sumSaleUnits(sales);
    const totalAmount = sales.reduce((acc, s) => acc + Number(s.total || 0), 0);

    const totalPurchases = purchases.length;
    const totalPurchaseAmount = purchases.reduce((acc, p) => acc + Number(p.total || 0), 0);

    const closure = new CashClosure({
      date,
      totalSales,
      totalItems,
      totalAmount,
      totalPurchases,
      totalPurchaseAmount,
      closedBy: req.user.id
    });

    await closure.save();
    res.json(closure);
  } catch (error) {
    next(error);
  }
};
