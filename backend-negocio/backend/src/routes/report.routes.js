import { Router } from "express";
import { auth } from "../middlewares/auth.middleware.js";
import { checkRole } from "../middlewares/role.middleware.js";
import { getSalesDaily, getSalesSummary, getTopProducts } from "../controllers/report.controller.js";

const router = Router();

// Reportes: por defecto solo admin (si querés cashier, agregalo en roles)
router.get("/summary", auth, checkRole("admin"), getSalesSummary);
router.get("/daily", auth, checkRole("admin"), getSalesDaily);
router.get("/top-products", auth, checkRole("admin"), getTopProducts);

export default router;
