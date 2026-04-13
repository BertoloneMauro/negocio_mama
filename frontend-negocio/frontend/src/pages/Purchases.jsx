import { useEffect, useMemo, useRef, useState } from "react";
import { getProducts } from "../api/products";
import { createPurchase } from "../api/purchases";
import api from "../api/axios"; // ✅ para listar/leer compras sin tocar tu api/purchases.js
import BackToDashboard from "../components/BackToDashboard";
import BarcodeInput from "../components/BarcodeInput";

const money = (n) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(Number(n || 0));

const normCode = (v) => String(v || "").trim().replace(/\s+/g, "");

export default function Purchases() {
  const [products, setProducts] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const [supplier, setSupplier] = useState("");
  const [cart, setCart] = useState([]); // { _id, name, stock, qty, cost }
  const [saving, setSaving] = useState(false);

  // ✅ Historial de compras
  const [period, setPeriod] = useState("today");
  const [purchasesData, setPurchasesData] = useState({
    totalPurchases: 0,
    totalAmount: 0,
    totalItems: 0,
    purchases: [],
  });
  const [loadingPurchases, setLoadingPurchases] = useState(false);
  const [purchasesError, setPurchasesError] = useState("");
  const [selectedPurchase, setSelectedPurchase] = useState(null);

  // ✅ Ticket interno (opcional) / reimprimir última compra
  const [lastReceipt, setLastReceipt] = useState(null);
  const lastReceiptRef = useRef(null);
  useEffect(() => {
    lastReceiptRef.current = lastReceipt;
  }, [lastReceipt]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await getProducts();
      const list = Array.isArray(data) ? data : data?.products || [];
      setProducts(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return products;

    return products.filter((p) => {
      const name = String(p.name || "").toLowerCase();
      const bc = String(p.barcode || "").toLowerCase();
      return name.includes(s) || bc.includes(s);
    });
  }, [products, q]);

  const total = useMemo(() => {
    return cart.reduce((acc, it) => acc + Number(it.qty || 0) * Number(it.cost || 0), 0);
  }, [cart]);

  // ✅ (1) CORRECCIÓN: “Añadir” suma +1 si ya existe en carrito
  const addToCart = (p) => {
    setCart((prev) => {
      const found = prev.find((x) => x._id === p._id);

      if (!found) {
        return [
          ...prev,
          {
            _id: p._id,
            name: p.name,
            stock: Number(p.stock || 0),
            qty: 1,
            cost: Number(p.price || 0),
          },
        ];
      }

      return prev.map((x) =>
        x._id === p._id ? { ...x, qty: Math.max(1, Number(x.qty || 0) + 1) } : x
      );
    });
  };

  const removeItem = (id) => setCart((prev) => prev.filter((x) => x._id !== id));
  const clearCart = () => setCart([]);

  const setField = (id, key, value) => {
    setCart((prev) =>
      prev.map((x) => {
        if (x._id !== id) return x;
        const n = Number(value);
        if (!Number.isFinite(n)) return x;
        if (key === "qty") return { ...x, qty: Math.max(1, Math.floor(n)) };
        if (key === "cost") return { ...x, cost: Math.max(0, n) };
        return x;
      })
    );
  };

  // ✅ Escaneo por barcode: agrega o incrementa
  const handleScan = (codeRaw) => {
    const code = normCode(codeRaw);
    if (!code) return;

    const found =
      products.find((p) => normCode(p.barcode) === code) ||
      products.find((p) => {
        const pb = normCode(p.barcode);
        if (!pb) return false;
        const a = pb.replace(/^0+/, "");
        const b = code.replace(/^0+/, "");
        return a && b && a === b;
      });

    if (!found) {
      alert(`No se encontró un producto con código: ${code}`);
      return;
    }
    addToCart(found);
  };

  // ✅ Ticket interno (opcional)
  const buildReceiptHTML = (receipt) => {
    const lines = (receipt.items || [])
      .map((it) => {
        const name = String(it.name || "").slice(0, 26);
        const qty = Number(it.qty || 0);
        const cost = Number(it.cost || 0);
        const sub = qty * cost;
        return `
          <div class="row">
            <div class="name">${name}</div>
            <div class="nums">${qty} x ${money(cost)}</div>
            <div class="sub">${money(sub)}</div>
          </div>
        `;
      })
      .join("");

    const supplierTxt = String(receipt.supplier || "").trim();
    const createdAt = receipt.createdAt ? new Date(receipt.createdAt) : new Date();

    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Comprobante Compra</title>
  <style>
    @page { size: 80mm auto; margin: 6mm; }
    body { font-family: Arial, sans-serif; font-size: 12px; }
    .center { text-align: center; }
    .muted { opacity: .8; }
    .hr { border-top: 1px dashed #000; margin: 8px 0; }
    .row { display: grid; grid-template-columns: 1fr; gap: 2px; margin: 6px 0; }
    .name { font-weight: 700; }
    .nums { display: flex; justify-content: space-between; }
    .sub { text-align: right; font-weight: 700; }
    .tot { display: flex; justify-content: space-between; font-size: 14px; font-weight: 800; margin-top: 6px; }
    .small { font-size: 11px; }
  </style>
</head>
<body>
  <div class="center">
    <div style="font-size: 15px; font-weight: 900;">COMPROBANTE INTERNO DE COMPRA</div>
    <div class="small muted">${createdAt.toLocaleString("es-AR")}</div>
    ${supplierTxt ? `<div class="small">Proveedor: <b>${supplierTxt}</b></div>` : ""}
  </div>

  <div class="hr"></div>
  ${lines || `<div class="muted">Sin items</div>`}
  <div class="hr"></div>

  <div class="tot">
    <div>TOTAL</div>
    <div>${money(receipt.total)}</div>
  </div>

  <div class="hr"></div>
  <div class="center small muted">Generado por el sistema</div>
</body>
</html>`;
  };

  const printReceipt = (receipt) => {
    try {
      const html = buildReceiptHTML(receipt);
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write(html);
      doc.close();

      setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => document.body.removeChild(iframe), 500);
      }, 200);
    } catch (e) {
      alert("No se pudo imprimir el comprobante");
      console.error(e);
    }
  };

  const confirmPurchase = async () => {
    if (cart.length === 0) return alert("Carrito vacío");

    for (const it of cart) {
      if (!it.qty || it.qty <= 0) return alert("Cantidad inválida");
      if (!it.cost || it.cost <= 0) return alert("Costo inválido");
    }

    setSaving(true);
    try {
      const items = cart.map((it) => ({
        product: it._id,
        quantity: Number(it.qty),
        cost: Number(it.cost),
      }));

      const receipt = {
        supplier,
        createdAt: new Date().toISOString(),
        items: cart.map((it) => ({ name: it.name, qty: Number(it.qty), cost: Number(it.cost) })),
        total: Number(
          cart.reduce((acc, it) => acc + Number(it.qty || 0) * Number(it.cost || 0), 0)
        ),
      };

      await createPurchase(items, supplier);

      setLastReceipt(receipt);
      alert("Compra registrada");

      clearCart();
      setSupplier("");
      await loadProducts();
      await loadPurchases(); // ✅ refrescar historial
    } catch (e) {
      alert(e?.response?.data?.message || "Error registrando compra");
    } finally {
      setSaving(false);
    }
  };

  // ✅ (2) CORRECCIÓN: historial + ver compra completa
  const loadPurchases = async () => {
    setLoadingPurchases(true);
    setPurchasesError("");
    try {
      // Requiere backend: GET /purchases?period=today|week|month|all
      const { data } = await api.get("/purchases", { params: { period } });

      if (Array.isArray(data)) {
        setPurchasesData({
          totalPurchases: data.length,
          totalAmount: data.reduce((a, p) => a + Number(p.total || 0), 0),
          totalItems: data.reduce(
            (s, p) => s + (p.items || []).reduce((a, it) => a + Number(it.quantity || 0), 0),
            0
          ),
          purchases: data,
        });
      } else {
        setPurchasesData({
          totalPurchases: data?.totalPurchases ?? (data?.purchases?.length || 0),
          totalAmount: data?.totalAmount ?? 0,
          totalItems: data?.totalItems ?? 0,
          purchases: data?.purchases ?? [],
        });
      }
    } catch (e) {
      const msg =
        e?.response?.status === 404
          ? "Historial no disponible: falta implementar GET /purchases en el backend."
          : e?.response?.data?.message || "No se pudo cargar el historial de compras.";
      setPurchasesError(msg);
      setPurchasesData({ totalPurchases: 0, totalAmount: 0, totalItems: 0, purchases: [] });
    } finally {
      setLoadingPurchases(false);
    }
  };

  const openPurchase = async (id) => {
    try {
      // Requiere backend: GET /purchases/:id
      const { data } = await api.get(`/purchases/${id}`);
      setSelectedPurchase(data);
    } catch (e) {
      alert(
        e?.response?.status === 404
          ? "Detalle no disponible: falta implementar GET /purchases/:id en el backend."
          : e?.response?.data?.message || "No se pudo abrir la compra."
      );
    }
  };

  useEffect(() => {
    loadPurchases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  return (
    <div className="app-shell" >
      <BackToDashboard />

      <h1>Compras</h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.2fr .8fr",
          gap: 14,
          alignItems: "start",
        }}
      >
        {/* Productos */}
        <div>
          <h3 style={{ marginTop: 0 }}>Productos</h3>

          <div
            style={{
              display: "flex",
              gap: 10,
              marginBottom: 10,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <input
              placeholder="Buscar producto (nombre o barcode)..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ minWidth: 260 }}
            />
            <button onClick={loadProducts}>Refrescar</button>

            <div style={{ marginLeft: "auto" }}>
              <BarcodeInput onScan={handleScan} />
            </div>
          </div>

          {loading ? (
            <div>Cargando...</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left" }}>
                  <th style={{ borderBottom: "1px solid #333", padding: 8 }}>Nombre</th>
                  <th style={{ borderBottom: "1px solid #333", padding: 8 }}>Stock</th>
                  <th style={{ borderBottom: "1px solid #333", padding: 8 }}>Precio venta</th>
                  <th style={{ borderBottom: "1px solid #333", padding: 8, width: 120 }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p._id}>
                    <td style={{ borderBottom: "1px solid #222", padding: 8 }}>
                      {p.name}{" "}
                      <span style={{ opacity: 0.7 }}>
                        ({p.category?.name || "—"})
                        {p.barcode ? ` · ${p.barcode}` : ""}
                      </span>
                    </td>
                    <td style={{ borderBottom: "1px solid #222", padding: 8 }}>{p.stock}</td>
                    <td style={{ borderBottom: "1px solid #222", padding: 8 }}>{money(p.price)}</td>
                    <td style={{ borderBottom: "1px solid #222", padding: 8 }}>
                      <button onClick={() => addToCart(p)}>Añadir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Carrito */}
        <div>
          <h3 style={{ marginTop: 0 }}>Carrito</h3>

          <div style={{ display: "flex", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
            <input
              placeholder="Proveedor (opcional)"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              style={{ minWidth: 260 }}
            />

            {lastReceipt && (
              <button type="button" onClick={() => printReceipt(lastReceiptRef.current)} style={{ marginLeft: "auto" }}>
                Imprimir última compra
              </button>
            )}
          </div>

          {cart.length === 0 ? (
            <div style={{ opacity: 0.8 }}>No hay productos agregados.</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {cart.map((it) => (
                <div key={it._id} style={{ border: "1px solid #333", borderRadius: 12, padding: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{it.name}</div>
                      <div style={{ opacity: 0.7 }}>Stock actual: {it.stock}</div>
                    </div>
                    <button onClick={() => removeItem(it._id)}>Quitar</button>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "center",
                      marginTop: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ display: "grid", gap: 6 }}>
                      <label>Cantidad</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        value={it.qty}
                        onChange={(e) => setField(it._id, "qty", e.target.value)}
                        style={{ width: 120 }}
                      />
                    </div>

                    <div style={{ display: "grid", gap: 6 }}>
                      <label>Costo unitario</label>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        value={it.cost}
                        onChange={(e) => setField(it._id, "cost", e.target.value)}
                        style={{ width: 160 }}
                      />
                    </div>

                    <div style={{ marginLeft: "auto", fontWeight: 700 }}>
                      Subtotal: {money(Number(it.qty) * Number(it.cost))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: 12, borderTop: "1px solid #333", paddingTop: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18 }}>
              <b>Total</b>
              <b>{money(total)}</b>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 10, justifyContent: "flex-end" }}>
              <button onClick={clearCart} disabled={saving || cart.length === 0}>
                Vaciar
              </button>
              <button onClick={confirmPurchase} disabled={saving || cart.length === 0}>
                {saving ? "Registrando..." : "Confirmar compra"}
              </button>
            </div>
          </div>

          {/* ✅ Historial */}
          <hr style={{ margin: "18px 0" }} />

          <h3>Compras del período</h3>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <select value={period} onChange={(e) => setPeriod(e.target.value)}>
              <option value="today">Hoy</option>
              <option value="week">Últimos 7 días</option>
              <option value="month">Este mes</option>
              <option value="all">Todas</option>
            </select>

            <button onClick={loadPurchases} disabled={loadingPurchases}>
              {loadingPurchases ? "Cargando..." : "Refrescar"}
            </button>
          </div>

          {purchasesError ? (
            <div style={{ marginTop: 10, color: "crimson" }}>{purchasesError}</div>
          ) : (
            <>
              <div style={{ marginTop: 10, lineHeight: 1.7 }}>
                <div>
                  Total de compras: <b>{purchasesData.totalPurchases || 0}</b>
                </div>
                <div>
                  Unidades compradas: <b>{purchasesData.totalItems || 0}</b>
                </div>
                <div>
                  Total comprado: <b>{money(purchasesData.totalAmount || 0)}</b>
                </div>
              </div>

              <div style={{ marginTop: 10 }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ textAlign: "left" }}>
                      <th style={{ borderBottom: "1px solid #333", padding: 8 }}>Fecha</th>
                      <th style={{ borderBottom: "1px solid #333", padding: 8 }}>Proveedor</th>
                      <th style={{ borderBottom: "1px solid #333", padding: 8 }}>Unidades</th>
                      <th style={{ borderBottom: "1px solid #333", padding: 8 }}>Total</th>
                      <th style={{ borderBottom: "1px solid #333", padding: 8 }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(purchasesData.purchases || []).map((p) => {
                      const units = (p.items || []).reduce(
                        (a, it) => a + Number(it.quantity || 0),
                        0
                      );
                      return (
                        <tr key={p._id}>
                          <td style={{ borderBottom: "1px solid #222", padding: 8 }}>
                            {p.createdAt ? new Date(p.createdAt).toLocaleString("es-AR") : "-"}
                          </td>
                          <td style={{ borderBottom: "1px solid #222", padding: 8 }}>
                            {p.supplier || "-"}
                          </td>
                          <td style={{ borderBottom: "1px solid #222", padding: 8 }}>{units}</td>
                          <td style={{ borderBottom: "1px solid #222", padding: 8 }}>
                            {money(p.total)}
                          </td>
                          <td style={{ borderBottom: "1px solid #222", padding: 8 }}>
                            <button onClick={() => openPurchase(p._id)}>Ver</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ✅ Modal detalle compra */}
      {selectedPurchase && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.45)",
            display: "grid",
            placeItems: "center",
            padding: 12,
            zIndex: 9999,
          }}
          onClick={() => setSelectedPurchase(null)}
        >
          <div
            style={{
              background: "#fff",
              width: "min(900px, 96vw)",
              maxHeight: "90vh",
              overflow: "auto",
              borderRadius: 14,
              padding: 14,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>Compra</div>
                <div style={{ opacity: 0.8 }}>
                  {selectedPurchase.createdAt ? new Date(selectedPurchase.createdAt).toLocaleString("es-AR") : ""}
                  {selectedPurchase.supplier ? ` · Proveedor: ${selectedPurchase.supplier}` : ""}
                </div>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => {
                    const rec = {
                      supplier: selectedPurchase.supplier,
                      createdAt: selectedPurchase.createdAt,
                      items: (selectedPurchase.items || []).map((it) => ({
                        name: it.product?.name || "Producto",
                        qty: Number(it.quantity || 0),
                        cost: Number(it.cost || 0),
                      })),
                      total: Number(selectedPurchase.total || 0),
                    };
                    printReceipt(rec);
                  }}
                >
                  Imprimir
                </button>
                <button onClick={() => setSelectedPurchase(null)}>Cerrar</button>
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ textAlign: "left" }}>
                    <th style={{ borderBottom: "1px solid #333", padding: 8 }}>Producto</th>
                    <th style={{ borderBottom: "1px solid #333", padding: 8 }}>Cantidad</th>
                    <th style={{ borderBottom: "1px solid #333", padding: 8 }}>Costo</th>
                    <th style={{ borderBottom: "1px solid #333", padding: 8 }}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedPurchase.items || []).map((it, idx) => {
                    const name = it.product?.name || "Producto";
                    const qty = Number(it.quantity || 0);
                    const cost = Number(it.cost || 0);
                    return (
                      <tr key={it._id || idx}>
                        <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>{name}</td>
                        <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>{qty}</td>
                        <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>{money(cost)}</td>
                        <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>{money(qty * cost)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12, fontSize: 18 }}>
                <b>Total: {money(selectedPurchase.total)}</b>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
