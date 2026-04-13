import { useEffect, useMemo, useState } from "react";
import { getProducts } from "../api/products";
import { getStockHistory } from "../api/stock";
import BackToDashboard from "../components/BackToDashboard";

const TYPE_LABEL = { IN: "ENTRADA", OUT: "SALIDA" };
const REASON_LABEL = {
  SALE: "VENTA",
  PURCHASE: "COMPRA",
  ADJUSTMENT: "AJUSTE",
  RETURN: "DEVOLUCIÓN",
};

export default function Stock() {
  const [products, setProducts] = useState([]);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState("");
  const [history, setHistory] = useState([]);
  const [loadingP, setLoadingP] = useState(true);
  const [loadingH, setLoadingH] = useState(false);

  const loadProducts = async () => {
    setLoadingP(true);
    try {
      const data = await getProducts();
      const arr = Array.isArray(data) ? data : [];
      setProducts(arr);
      if (!selected && arr[0]?._id) setSelected(arr[0]._id);
    } finally {
      setLoadingP(false);
    }
  };

  const loadHistory = async (productId) => {
    if (!productId) return;
    setLoadingH(true);
    try {
      const data = await getStockHistory(productId);
      setHistory(Array.isArray(data) ? data : []);
    } finally {
      setLoadingH(false);
    }
  };

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selected) loadHistory(selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return products;
    return products.filter((p) => (p.name || "").toLowerCase().includes(s));
  }, [products, q]);

  return (
    <div className="app-shell">
      <BackToDashboard />
      <h1>Stock</h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 2fr",
          gap: 14,
          alignItems: "start",
        }}
      >
        {/* Selector producto */}
        <div>
          <h3 style={{ marginTop: 0 }}>Producto</h3>

          <input
            placeholder="Buscar..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ width: "100%", marginBottom: 10 }}
          />

          {loadingP ? (
            <div>Cargando...</div>
          ) : (
            <div
              className="card"
              style={{
                overflow: "hidden",
              }}
            >
              {filtered.map((p, idx) => {
                const isSel = selected === p._id;
                return (
                  <button
                    key={p._id}
                    onClick={() => setSelected(p._id)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      border: "none",
                      borderBottom:
                        idx === filtered.length - 1 ? "none" : "1px solid var(--border)",
                      borderRadius: 0,
                      padding: 12,
                      background: isSel ? "rgba(22,163,74,.12)" : "transparent",
                      color: "var(--text)",
                      cursor: "pointer",
                      boxShadow: "none",
                      transform: "none",
                    }}
                  >
                    <div style={{ fontWeight: 800 }}>{p.name}</div>
                    <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 3 }}>
                      Stock: {p.stock} | Mín: {p.minStock}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Historial */}
        <div>
          <h3 style={{ marginTop: 0 }}>Historial de movimientos</h3>

          <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
            <button onClick={() => loadHistory(selected)} disabled={!selected || loadingH}>
              {loadingH ? "Cargando..." : "Refrescar"}
            </button>
          </div>

          {loadingH ? (
            <div>Cargando...</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Motivo</th>
                    <th>Cant.</th>
                    <th>Antes</th>
                    <th>Después</th>
                    <th>Usuario</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((m) => {
                    const dt = new Date(m.createdAt);
                    const when = `${dt.toLocaleDateString()} ${dt
                      .toLocaleTimeString()
                      .slice(0, 5)}`;

                    const tipo = TYPE_LABEL[m.type] || m.type;
                    const motivo = REASON_LABEL[m.reason] || m.reason;

                    return (
                      <tr key={m._id}>
                        <td>{when}</td>
                        <td>{tipo}</td>
                        <td>{motivo}</td>
                        <td>{m.quantity}</td>
                        <td>{m.stockBefore}</td>
                        <td>{m.stockAfter}</td>
                        <td>{m.createdBy?.email || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
