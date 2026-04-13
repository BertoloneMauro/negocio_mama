import { Router } from "express";
import { auth } from "../middlewares/auth.middleware.js";
import { checkRole } from "../middlewares/role.middleware.js";

import {
  createProduct,
  getProducts,
  updateProduct,
  deleteProduct,
  updateStock,
  adjustStock,
  getLowStockProducts
} from "../controllers/product.controller.js";

const router = Router();

/*
  PRODUCTOS
  - Admin: crear, editar, borrar
  - User/Admin: modificar stock
*/

// Crear producto (solo admin)
router.post("/", auth, checkRole("admin"), createProduct);

// Listar productos (libre o logueado)
router.get("/", getProducts);

// Productos con bajo stock (admin)
router.get("/low-stock", auth, checkRole("admin"), getLowStockProducts);

// Editar producto (admin)
router.put("/:id", auth, checkRole("admin"), updateProduct);

// Eliminar producto (admin)
router.delete("/:id", auth, checkRole("admin"), deleteProduct);

// Actualizar stock directo (admin / user)
router.patch("/:id/stock", auth, checkRole("admin", "cashier"), updateStock);

// Ajuste manual de stock (admin)
router.patch(
  "/:id/adjust-stock",
  auth,
  checkRole("admin"),
  adjustStock
);

export default router;
