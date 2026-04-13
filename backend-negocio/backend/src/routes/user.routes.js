// src/routes/user.routes.js
import { Router } from "express";
import { auth } from "../middlewares/auth.middleware.js";
import { checkRole } from "../middlewares/role.middleware.js";

import {
  listUsers,
  createUserAdmin,
  updateUserAdmin,
  setUserActiveAdmin
} from "../controllers/user.controller.js";

const router = Router();

// Todo admin
router.get("/", auth, checkRole("admin"), listUsers);

// crear usuario (admin)
router.post("/", auth, checkRole("admin"), createUserAdmin);

// editar email/role/password (admin)
router.patch("/:id", auth, checkRole("admin"), updateUserAdmin);

// activar/desactivar (admin)
router.patch("/:id/active", auth, checkRole("admin"), setUserActiveAdmin);

export default router;
