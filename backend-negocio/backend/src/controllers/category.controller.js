import Category from "../models/Category.js";

// Crear categoría (si existe desactivada, la reactiva)
export const createCategory = async (req, res, next) => {
  try {
    const name = String(req.body.name || "").trim();
    if (!name) return res.status(400).json({ message: "Nombre requerido" });

    const existing = await Category.findOne({ name });
    if (existing) {
      // si existe pero está desactivada, la reactivamos
      if (!existing.isActive) {
        existing.isActive = true;
        await existing.save();
        return res.json(existing);
      }
      return res.status(400).json({ message: "La categoría ya existe" });
    }

    const category = await Category.create({ name, isActive: true });
    res.status(201).json(category);
  } catch (err) {
    next(err);
  }
};

// Listar categorías
// - por defecto solo activas
// - si ?all=true, trae todas
export const getCategories = async (req, res, next) => {
  try {
    const all = String(req.query.all || "false") === "true";
    const filter = all ? {} : { isActive: true };

    const categories = await Category.find(filter).sort({ name: 1 });
    res.json(categories);
  } catch (err) {
    next(err);
  }
};

// Editar nombre (admin)
export const updateCategory = async (req, res, next) => {
  try {
    const name = String(req.body.name || "").trim();
    if (!name) return res.status(400).json({ message: "Nombre requerido" });

    // Evitar duplicados (por unique también, pero esto te da un error lindo)
    const exists = await Category.findOne({ name, _id: { $ne: req.params.id } });
    if (exists) return res.status(400).json({ message: "Ya existe otra categoría con ese nombre" });

    const updated = await Category.findByIdAndUpdate(
      req.params.id,
      { name },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "Categoría no encontrada" });
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

// Activar/Desactivar (admin)
export const setCategoryActive = async (req, res, next) => {
  try {
    const isActive = Boolean(req.body.isActive);

    const updated = await Category.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "Categoría no encontrada" });
    res.json(updated);
  } catch (err) {
    next(err);
  }
};
