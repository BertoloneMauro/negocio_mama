import { useEffect, useState } from "react";
import { createCategory, getCategories, setCategoryActive, updateCategory } from "../api/categories";
import BackToDashboard from "../components/BackToDashboard";

export default function Categories() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [showAll, setShowAll] = useState(true);

  const load = async () => {
    const data = await getCategories(showAll);
    setItems(data);
  };

  useEffect(() => { load(); }, [showAll]);

  const onCreate = async (e) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    try {
      await createCategory(n);
      setName("");
      await load();
    } catch (err) {
      alert(err?.response?.data?.message || "Error creando categoría");
    }
  };

  const onEdit = async (cat) => {
    const nuevo = prompt("Nuevo nombre:", cat.name);
    if (nuevo === null) return;
    const n = nuevo.trim();
    if (!n) return alert("Nombre inválido");
    try {
      await updateCategory(cat._id, n);
      await load();
    } catch (err) {
      alert(err?.response?.data?.message || "Error editando categoría");
    }
  };

  const onToggle = async (cat) => {
    const next = !cat.isActive;
    const ok = confirm(next ? "¿Activar categoría?" : "¿Desactivar categoría?");
    if (!ok) return;

    try {
      await setCategoryActive(cat._id, next);
      await load();
    } catch (err) {
      alert(err?.response?.data?.message || "Error cambiando estado");
    }
  };

  return (
    <div className="app-shell">
      <BackToDashboard />
      
      <h1>Categorías</h1>

      <div style={{ display: "flex", gap: 10, alignItems: "center", margin: "12px 0" }}>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={showAll}
            onChange={(e) => setShowAll(e.target.checked)}
          />
          Ver también desactivadas
        </label>
      </div>

      <form onSubmit={onCreate} style={{ display: "flex", gap: 10, margin: "12px 0", flexWrap: "wrap" }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre categoría"
        />
        <button type="submit">Crear</button>
      </form>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left" }}>
            <th style={{ borderBottom: "1px solid #333", padding: 8 }}>Nombre</th>
            <th style={{ borderBottom: "1px solid #333", padding: 8 }}>Estado</th>
            <th style={{ borderBottom: "1px solid #333", padding: 8, width: 220 }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {items.map((c) => (
            <tr key={c._id} style={{ opacity: c.isActive ? 1 : 0.6 }}>
              <td style={{ borderBottom: "1px solid #222", padding: 8 }}>{c.name}</td>
              <td style={{ borderBottom: "1px solid #222", padding: 8 }}>
                {c.isActive ? "Activa" : "Desactivada"}
              </td>
              <td style={{ borderBottom: "1px solid #222", padding: 8 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => onEdit(c)}>Editar</button>
                  <button onClick={() => onToggle(c)}>
                    {c.isActive ? "Desactivar" : "Activar"}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
