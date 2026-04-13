import { Router } from "express";
import { login, register, me } from "../controllers/auth.controller.js";
import { auth } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/login", login);
router.post("/register", register);
router.get("/me", auth, me);

export default router;
