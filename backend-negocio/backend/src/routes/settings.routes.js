import { Router } from "express";
import Settings from "../models/Settings.js";
import { auth } from "../middlewares/auth.middleware.js";
import { checkRole } from "../middlewares/role.middleware.js";

const router = Router();

// GET: devuelve configuración (si no existe, la crea)
router.get("/", auth, async (req, res, next) => {
  try {
    let s = await Settings.findOne();
    if (!s) s = await Settings.create({});
    res.json(s);
  } catch (e) {
    next(e);
  }
});

// PATCH: actualiza configuración (solo admin)
router.patch("/", auth, checkRole("admin"), async (req, res, next) => {
  try {
    let s = await Settings.findOne();
    if (!s) s = await Settings.create({});

    const allowed = [
      "storeName",
      "storeAddress",
      "storePhone",
      "receiptWidthMm",
      "cashierLabelMode",
      "cashierCustomLabel",
    ];

    for (const k of allowed) {
      if (req.body[k] !== undefined) s[k] = req.body[k];
    }

    await s.save();
    res.json(s);
  } catch (e) {
    next(e);
  }
});

export default router;
