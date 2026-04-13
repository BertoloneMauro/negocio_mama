import { Router } from "express";
import { auth } from "../middlewares/auth.middleware.js";
import { checkRole } from "../middlewares/role.middleware.js";
import {
  createSale,
  getSales,
  getTodaySales,
  getSalesByDateRange,
  voidSale,
  refundSale
} from "../controllers/sale.controller.js";

const router = Router();

// Crear venta (admin y cashier)
router.post("/", auth, checkRole("admin", "cashier"), createSale);

// Ventas del día (admin y cashier)
router.get("/today", auth, checkRole("admin", "cashier"), getTodaySales);

// Historial completo (solo admin)
router.get("/", auth, checkRole("admin"), getSales);
router.get("/range", auth, checkRole("admin", "cashier"), getSalesByDateRange);

router.post("/:id/void", auth, checkRole("admin"), voidSale);
router.post("/:id/refund", auth, checkRole("admin", "cashier"), refundSale);
export default router;
