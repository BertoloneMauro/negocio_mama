import { Router } from "express";
import { auth } from "../middlewares/auth.middleware.js";
import { checkRole } from "../middlewares/role.middleware.js";

import {
  createCategory,
  getCategories,
  updateCategory,
  setCategoryActive
} from "../controllers/category.controller.js";

const router = Router();

// Listar: libre (o si querés, poné auth)
router.get("/", getCategories);

// Admin: crear/editar/activar-desactivar
router.post("/", auth, checkRole("admin"), createCategory);
router.put("/:id", auth, checkRole("admin"), updateCategory);
router.patch("/:id/active", auth, checkRole("admin"), setCategoryActive);

export default router;
