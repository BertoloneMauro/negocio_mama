// middlewares/auth.middleware.js
// Middleware de autenticación JWT

import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // Verificar header
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No autorizado" });
    }

    // Obtener token
    const token = authHeader.split(" ")[1];

    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Cargar usuario (sin contraseña)
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json({ message: "Usuario no encontrado" });

      
    }
    if (user.isActive === false) {
  return res.status(401).json({ message: "Usuario desactivado" });
}
    

    // Adjuntar usuario al request
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token inválido" });
  }
};
