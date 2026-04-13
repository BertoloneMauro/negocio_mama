import { Router } from "express";
import { auth } from "../middlewares/auth.middleware.js";
import { checkRole } from "../middlewares/role.middleware.js";
import { closeDailyCash, getTodayCash, getClosuresByDateRange } from "../controllers/cash.controller.js";

const router = Router();

router.get("/today", auth, checkRole("admin", "cashier"), getTodayCash);

// Cerrar caja: solo admin (si querés permitir cashier, agregalo acá)
router.post("/close", auth, checkRole("admin"), closeDailyCash);

// Historial de cierres: admin
router.get("/closures", auth, checkRole("admin"), getClosuresByDateRange);

export default router;
    