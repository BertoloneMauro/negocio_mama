import Sale from "../models/Sale.js";
import Product from "../models/Product.js";

const TZ = process.env.REPORT_TZ || "America/Argentina/Buenos_Aires";

const parseLocalYMD = (ymd) => {
  // "YYYY-MM-DD" -> Date local 00:00
  const [y, m, d] = String(ymd).split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
};

const getRange = (from, to) => {
  if (!from || !to) {
    const err = new Error("from y to son requeridos (YYYY-MM-DD)");
    err.status = 400;
    throw err;
  }
  const start = parseLocalYMD(from);
  const end = parseLocalYMD(to);
  end.setDate(end.getDate() + 1); // exclusive
  return { start, end };
};

export const getSalesSummary = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const { start, end } = getRange(from, to);

    const agg = await Sale.aggregate([
      { $match: { createdAt: { $gte: start, $lt: end } } },
      {
        $project: {
          total: { $ifNull: ["$total", 0] },
          units: {
            $reduce: {
              input: { $ifNull: ["$items", []] },
              initialValue: 0,
              in: { $add: ["$$value", { $ifNull: ["$$this.quantity", 0] }] }
            }
          }
        }
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: 1 },
          totalAmount: { $sum: "$total" },
          totalItems: { $sum: "$units" }
        }
      }
    ]);

    const row = agg[0] || { totalSales: 0, totalAmount: 0, totalItems: 0 };
    res.json(row);
  } catch (e) {
    next(e);
  }
};

export const getSalesDaily = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const { start, end } = getRange(from, to);

    const days = await Sale.aggregate([
      { $match: { createdAt: { $gte: start, $lt: end } } },
      {
        $project: {
          day: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
              timezone: TZ
            }
          },
          total: { $ifNull: ["$total", 0] },
          units: {
            $reduce: {
              input: { $ifNull: ["$items", []] },
              initialValue: 0,
              in: { $add: ["$$value", { $ifNull: ["$$this.quantity", 0] }] }
            }
          }
        }
      },
      {
        $group: {
          _id: "$day",
          totalSales: { $sum: 1 },
          totalAmount: { $sum: "$total" },
          totalItems: { $sum: "$units" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json(
      days.map((d) => ({
        day: d._id,
        totalSales: d.totalSales,
        totalItems: d.totalItems,
        totalAmount: d.totalAmount
      }))
    );
  } catch (e) {
    next(e);
  }
};

export const getTopProducts = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const { start, end } = getRange(from, to);

    const limit = Math.min(Math.max(parseInt(req.query.limit || "10", 10), 1), 100);

    const rows = await Sale.aggregate([
      { $match: { createdAt: { $gte: start, $lt: end } } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          units: { $sum: { $ifNull: ["$items.quantity", 0] } },
          revenue: {
            $sum: {
              $multiply: [
                { $ifNull: ["$items.quantity", 0] },
                { $ifNull: ["$items.price", 0] }
              ]
            }
          }
        }
      },
      { $sort: { units: -1, revenue: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: Product.collection.name, // "products"
          localField: "_id",
          foreignField: "_id",
          as: "product"
        }
      },
      { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          productId: "$_id",
          name: "$product.name",
          barcode: "$product.barcode",
          units: 1,
          revenue: 1
        }
      }
    ]);

    res.json(rows);
  } catch (e) {
    next(e);
  }
};
