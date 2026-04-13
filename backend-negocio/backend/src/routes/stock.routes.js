import { Router } from "express";
import { auth } from "../middlewares/auth.middleware.js";
import { getProductStockHistory } from "../controllers/stock.controller.js";

const router = Router();

router.get("/:productId", auth, getProductStockHistory);

export default router;
