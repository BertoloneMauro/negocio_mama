// middlewares/isAdmin.middleware.js
// Permite acceso solo a administradores

export const isAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Acceso denegado" });
  }
  next();
};
