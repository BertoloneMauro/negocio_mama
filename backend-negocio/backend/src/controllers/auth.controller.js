// controllers/auth.controller.js
// Registro, login y usuario autenticado (JWT)

import User from "../models/User.js";
import bcrypt from "bcryptjs";
import generateToken from "../utils/generateToken.js";

/**
 * Registro de usuario
 */
export const register = async (req, res, next) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Faltan datos" });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: "El usuario ya existe" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      email,
      password: hashedPassword,
      role: role || "cashier"
    });

    await newUser.save();

    res.status(201).json({ message: "Usuario creado correctamente" });
  } catch (error) {
    next(error);
  }
};

/**
 * Login de usuario
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Faltan datos" });
    }

  const user = await User.findOne({ email });
   if (!user) return res.status(401).json({ message: "Credenciales inválidas" });

    
  if (user.isActive === false) {
   return res.status(403).json({ message: "Usuario deshabilitado" });
}

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Usuario autenticado
 */
export const me = async (req, res) => {
  res.json({
    id: req.user.id,
    email: req.user.email,
    role: req.user.role,
  });
};
