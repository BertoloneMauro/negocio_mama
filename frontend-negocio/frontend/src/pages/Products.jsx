import { useEffect, useMemo, useRef, useState } from "react";
import Modal from "../components/Modal";
import { useAuth } from "../context/AuthContext";
import { getCategories } from "../api/categories";
import { getProducts, createProduct, updateProduct, deleteProduct } from "../api/products";
import BackToDashboard from "../components/BackToDashboard";

const emptyForm = {
  name: "",
  barcode: "",
  price: "",
  category: "",
  stock: 0,
  minStock: 0,
  isActive: true,
};

const onlyDigits = (v) => String(v || "").replace(/\D/g, "");

export default function Products() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [items, setItems] = useState([]);
  const [cats, setCats] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("create"); // create | edit
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // ref al state para leer “lo último” dentro del listener
  const formRef = useRef(form);
  useEffect(() => {
    formRef.current = form;
  }, [form]);

  // buffer de scan
  const scanRef = useRef({
    buf: "",
    startTs: 0,
    lastTs: 0,
    targetName: "",
    snapshot: undefined,
    timer: null,
  });

  const loadAll = async () => {
    setLoading(true);
    try {
      const [prods, categories] = await Promise.all([getProducts(), getCategories(true)]);
      setItems(Array.isArray(prods) ? prods : []);
      setCats(Array.isArray(categories) ? categories : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const normalizeText = (str) =>
  String(str || "")
    .normalize("NFD")                 // separa letras y acentos
    .replace(/[\u0300-\u036f]/g, "")  // elimina acentos
    .toLowerCase();

const filtered = useMemo(() => {
  const s = normalizeText(q.trim());
  if (!s) return items;

  return items.filter((p) =>
    normalizeText(p.name).includes(s) ||
    String(p.barcode || "").includes(q.trim())
  );
}, [items, q]);

  const onChange = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const openCreate = () => {
    setMode("create");
    setEditingId(null);
    setForm({
      ...emptyForm,
      category: cats.find((c) => c.isActive)?.["_id"] || cats[0]?._id || "",
    });
    setOpen(true);
  };

  const openEdit = (p) => {
    setMode("edit");
    setEditingId(p._id);
    setForm({
      name: p.name ?? "",
      barcode: p.barcode ?? "",
      price: String(p.price ?? ""),
      category: p.category?._id || p.category || "",
      stock: Number(p.stock ?? 0),
      minStock: Number(p.minStock ?? 5),
      isActive: Boolean(p.isActive ?? true),
    });
    setOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setOpen(false);
  };

  const validate = () => {
    if (!form.name.trim()) return "Falta el nombre";
    const price = Number(form.price);
    if (!Number.isFinite(price) || price <= 0) return "Precio inválido";
    if (!form.category) return "Seleccioná una categoría";
    const stock = Number(form.stock);
    const minStock = Number(form.minStock);
    if (!Number.isFinite(stock) || stock < 0) return "Stock inválido";
    if (!Number.isFinite(minStock) || minStock < 0) return "MinStock inválido";
    return null;
  };

const onSubmit = async (e) => {
  e.preventDefault();
  const err = validate();
  if (err) return alert(err);

  setSaving(true);
  try {
    const payload = {
      name: form.name.trim(),
      barcode: form.barcode?.trim() || "",
      price: Number(form.price),
      category: form.category,
      stock: Number(form.stock),
      minStock: Number(form.minStock),
      isActive: Boolean(form.isActive),
    };

    if (mode === "create") {
      await createProduct(payload);
      await loadAll(); // dejamos create como estaba
    } else {
      await updateProduct(editingId, payload);

      // 🔥 Actualización local sin romper category
      setItems((prev) =>
        prev.map((p) => {
          if (p._id !== editingId) return p;

          const categoryObj = cats.find(
            (c) => c._id === payload.category
          );

          return {
            ...p,
            ...payload,
            category: categoryObj || p.category,
          };
        })
      );
    }

    setOpen(false);
  } catch (e2) {
    alert(e2?.response?.data?.message || "Error guardando producto");
  } finally {
    setSaving(false);
  }
};

  const onDelete = async (p) => {
    if (!isAdmin) return;
    const ok = confirm(`¿Desactivar "${p.name}"?`);
    if (!ok) return;

    try {
      await deleteProduct(p._id);
      await loadAll();
    } catch (e) {
      alert(e?.response?.data?.message || "Error desactivando producto");
    }
  };

  // Evita que Enter dispare submit accidental (especialmente por el lector)
  const onFormKeyDownCapture = (e) => {
    if (e.key !== "Enter") return;
    const tag = (e.target?.tagName || "").toLowerCase();
    if (tag === "textarea") return;
    e.preventDefault();
    e.stopPropagation();
  };

  // ✅ Listener de escaneo SIN bloquear tipeo normal
  useEffect(() => {
    if (!open) return;

    const clear = () => {
      const s = scanRef.current;
      s.buf = "";
      s.startTs = 0;
      s.lastTs = 0;
      s.targetName = "";
      s.snapshot = undefined;
      if (s.timer) {
        clearTimeout(s.timer);
        s.timer = null;
      }
    };

    const looksLikeScan = (len, durationMs) => {
      // scanners: 10-13 dígitos extremadamente rápido
      // ajustado para que NO afecte tipeo humano
      const avg = durationMs / Math.max(1, len);
      return (
        (len >= 8 && durationMs <= 550 && avg <= 35) ||
        (len >= 6 && durationMs <= 260 && avg <= 25)
      );
    };

    const onKeyDown = (e) => {
      if (!isAdmin) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const key = e.key;
      const now = Date.now();
      const s = scanRef.current;

      // dígito
      if (/^[0-9]$/.test(key)) {
        if (!s.buf) {
          s.startTs = now;
          const el = document.activeElement;
          s.targetName = el?.getAttribute?.("name") || "";

          // snapshot del campo donde cayó el scan (para restaurarlo si hace falta)
          const cur = formRef.current;
          if (s.targetName && Object.prototype.hasOwnProperty.call(cur, s.targetName)) {
            s.snapshot = cur[s.targetName];
          } else {
            s.snapshot = undefined;
          }
        }

        s.buf += key;
        s.lastTs = now;

        // si no llega Enter pronto, limpiamos (tipeo normal)
        if (s.timer) clearTimeout(s.timer);
        s.timer = setTimeout(() => clear(), 320);

        return; // 👈 NO prevenimos, así se puede tipear normal
      }

      // Enter
      if (key === "Enter" && s.buf) {
        const len = s.buf.length;
        const duration = now - (s.startTs || now);
        const isScan = looksLikeScan(len, duration);

        if (isScan) {
          e.preventDefault();
          e.stopPropagation();

          const digits = onlyDigits(s.buf);
          const restoreKey = s.targetName;
          const snap = s.snapshot;

          setForm((prev) => {
            const next = { ...prev, barcode: digits };

            // Si el scan cayó en otro input (precio/stock/etc), lo restauramos
            if (
              restoreKey &&
              restoreKey !== "barcode" &&
              Object.prototype.hasOwnProperty.call(prev, restoreKey) &&
              snap !== undefined
            ) {
              next[restoreKey] = snap;
            }

            return next;
          });
        }

        clear();
        return;
      }

      // otra tecla: si pasó mucho tiempo, limpiamos buffer
      if (s.buf && now - s.lastTs > 350) clear();
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      const s = scanRef.current;
      if (s.timer) clearTimeout(s.timer);
      s.timer = null;
      clear();
    };
  }, [open, isAdmin]);

  return (
    <div className="app-shell">
      <BackToDashboard />
      <h1>Productos</h1>

      <div style={{ display: "flex", gap: 10, alignItems: "center", margin: "12px 0", flexWrap: "wrap" }}>
        <input
          placeholder="Buscar producto..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ minWidth: 260 }}
        />
        {isAdmin && <button onClick={openCreate}>+ Nuevo</button>}
        <button onClick={loadAll}>Refrescar</button>
      </div>

      {loading ? (
        <div>Cargando...</div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left" }}>
              <th style={{ borderBottom: "1px solid #333", padding: 8 }}>Nombre</th>
              <th style={{ borderBottom: "1px solid #333", padding: 8 }}>CB</th>
              <th style={{ borderBottom: "1px solid #333", padding: 8 }}>Categoría</th>
              <th style={{ borderBottom: "1px solid #333", padding: 8 }}>Precio</th>
              <th style={{ borderBottom: "1px solid #333", padding: 8 }}>Stock</th>
              <th style={{ borderBottom: "1px solid #333", padding: 8 }}>Min</th>
              <th style={{ borderBottom: "1px solid #333", padding: 8, width: 160 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p._id}>
                <td style={{ borderBottom: "1px solid #222", padding: 8 }}>{p.name}</td>
                <td style={{ borderBottom: "1px solid #222", padding: 8, opacity: 0.8 }}>
                  {p.barcode || "—"}
                </td>
                <td style={{ borderBottom: "1px solid #222", padding: 8 }}>{p.category?.name || "—"}</td>
                <td style={{ borderBottom: "1px solid #222", padding: 8 }}>{p.price}</td>
                <td style={{ borderBottom: "1px solid #222", padding: 8 }}>{p.stock}</td>
                <td style={{ borderBottom: "1px solid #222", padding: 8 }}>{p.minStock}</td>
                <td style={{ borderBottom: "1px solid #222", padding: 8 }}>{p.isActive ? "Sí" : "No"}</td>
                <td style={{ borderBottom: "1px solid #222", padding: 8 }}>
                  {isAdmin ? (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => openEdit(p)}>Editar</button>
                      <button onClick={() => onDelete(p)}>Desactivar</button>
                    </div>
                  ) : (
                    <span style={{ opacity: 0.6 }}>—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal open={open} title={mode === "create" ? "Nuevo producto" : "Editar producto"} onClose={closeModal}>
        {!isAdmin ? (
          <div>No autorizado</div>
        ) : (
          <form onSubmit={onSubmit} onKeyDownCapture={onFormKeyDownCapture} style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "grid", gap: 6 }}>
              <label>Nombre</label>
              <input
                name="name"
                value={form.name}
                onChange={(e) => onChange("name", e.target.value)}
              />
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <label>Código de barras (opcional)</label>
              <input
                name="barcode"
                value={form.barcode}
                onChange={(e) => onChange("barcode", onlyDigits(e.target.value))}
                placeholder="Podés escanear en cualquier momento (se guardará acá)"
                inputMode="numeric"
              />
              <div style={{ fontSize: 12, opacity: 0.75 }}>
                Tip: si escaneás estando en otro campo, se cargará acá igual.
              </div>
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <label>Categoría</label>
              <select
                name="category"
                value={form.category}
                onChange={(e) => onChange("category", e.target.value)}
                style={{ padding: 10 }}
              >
                {cats.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}{c.isActive ? "" : " (desactivada)"}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <div style={{ display: "grid", gap: 6, flex: 1, minWidth: 180 }}>
                <label>Precio</label>
                <input
                  name="price"
                  type="number"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => onChange("price", e.target.value)}
                />
              </div>

              <div style={{ display: "grid", gap: 6, flex: 1, minWidth: 180 }}>
                <label>Stock</label>
                <input
                  name="stock"
                  type="number"
                  value={form.stock}
                  onChange={(e) => onChange("stock", e.target.value)}
                />
              </div>

              <div style={{ display: "grid", gap: 6, flex: 1, minWidth: 180 }}>
                <label>Stock mínimo</label>
                <input
                  name="minStock"
                  type="number"
                  value={form.minStock}
                  onChange={(e) => onChange("minStock", e.target.value)}
                />
              </div>
            </div>



            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button type="button" onClick={closeModal} disabled={saving}>
                Cancelar
              </button>
              <button type="submit" disabled={saving}>
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
