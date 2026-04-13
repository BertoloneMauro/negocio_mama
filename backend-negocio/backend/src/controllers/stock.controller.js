import StockMovement from "../models/StockMovement.js";

export const getProductStockHistory = async (req, res, next) => {
  try {
    const movements = await StockMovement.find({
      product: req.params.productId
    })
      .populate("createdBy", "email")
      .sort({ createdAt: -1 });

    res.json(movements);
  } catch (error) {
    next(error);
  }
};
