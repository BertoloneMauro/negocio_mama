import { Router } from "express";
import { auth } from "../middlewares/auth.middleware.js";
import { checkRole } from "../middlewares/role.middleware.js";
import {
  createPurchase,
  getPurchases,
  getPurchaseById,
} from "../controllers/purchase.controller.js";

const router = Router();

router.post("/", auth, checkRole("admin", "cashier"), createPurchase);

// ✅ NUEVO: historial
router.get("/", auth, checkRole("admin", "cashier"), getPurchases);

// ✅ NUEVO: ver compra completa
router.get("/:id", auth, checkRole("admin", "cashier"), getPurchaseById);

export default router;
