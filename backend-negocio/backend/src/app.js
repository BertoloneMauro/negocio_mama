import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import fs from "fs";
import path from "path";

import { connectDB } from "./config/db.js";
import { errorHandler } from "./middlewares/error.middleware.js";

import productRoutes from "./routes/product.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import authRoutes from "./routes/auth.routes.js";
import saleRoutes from "./routes/sale.routes.js";
import stockRoutes from "./routes/stock.routes.js";
import purchaseRoutes from "./routes/purchase.routes.js";
import cashRoutes from "./routes/cash.routes.js";
import reportRoutes from "./routes/report.routes.js";
import userRoutes from "./routes/user.routes.js";
import settingsRoutes from "./routes/settings.routes.js";

dotenv.config({ path: process.env.ENV_FILE || ".env" });

const app = express();

// DB
connectDB();

// Middlewares base
app.use(express.json());

// ✅ CORS (simple y funcional)
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:4000"],
    credentials: true
  })
);

// ✅ Preflight seguro
app.use((req, res, next) => {
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});



// Routes API
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/sales", saleRoutes);
app.use("/api/stock", stockRoutes);
app.use("/api/purchases", purchaseRoutes);
app.use("/api/cash", cashRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/users", userRoutes);
app.use("/api/settings", settingsRoutes);

// ✅ Servir frontend compilado SOLO si existe FRONTEND_DIST
const frontendDist = process.env.FRONTEND_DIST;

if (frontendDist && fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));

  // ✅ Fallback compatible con Express 5 (NO usar "*")
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });

  console.log("✅ Sirviendo frontend desde:", frontendDist);
} else {
  console.log("⚠️ FRONTEND_DIST no seteado o no existe:", frontendDist);
}

// Error handler al final
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, "0.0.0.0", () => console.log(`Servidor corriendo en puerto ${PORT}`));