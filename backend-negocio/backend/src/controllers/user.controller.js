import bcrypt from "bcryptjs";
import User from "../models/User.js";

export const listUsers = async (req, res, next) => {
  try {
    const users = await User.find()
      .select("-password")
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (e) {
    next(e);
  }
};

export const createUserAdmin = async (req, res, next) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email y password son requeridos" });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: "El usuario ya existe" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      email,
      password: hashedPassword,
      role: role || "cashier",
      isActive: true
    });

    res.status(201).json({
      id: user._id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt
    });
  } catch (e) {
    next(e);
  }
};

export const updateUserAdmin = async (req, res, next) => {
  try {
    const { email, role, password } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

    if (email !== undefined) {
      const newEmail = String(email).trim();
      if (!newEmail) return res.status(400).json({ message: "Email inválido" });

      const exists = await User.findOne({ email: newEmail, _id: { $ne: user._id } });
      if (exists) return res.status(400).json({ message: "Ese email ya está en uso" });

      user.email = newEmail;
    }

    if (role !== undefined) {
      if (!["admin", "cashier"].includes(role)) {
        return res.status(400).json({ message: "Rol inválido" });
      }
      user.role = role;
    }

    if (password !== undefined) {
      const pass = String(password);
      if (pass.length < 3) return res.status(400).json({ message: "Password muy corta" });
      user.password = await bcrypt.hash(pass, 10);
    }

    await user.save();

    res.json({
      id: user._id,
      email: user.email,
      role: user.role,
      isActive: user.isActive
    });
  } catch (e) {
    next(e);
  }
};

export const setUserActiveAdmin = async (req, res, next) => {
  try {
    const { isActive } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

    user.isActive = Boolean(isActive);
    await user.save();

    res.json({
      id: user._id,
      email: user.email,
      role: user.role,
      isActive: user.isActive
    });
  } catch (e) {
    next(e);
  }
};
