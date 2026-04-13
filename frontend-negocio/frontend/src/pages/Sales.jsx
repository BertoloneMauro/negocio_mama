import { useEffect, useMemo, useRef, useState } from "react";
import { getProducts, updateProductStock } from "../api/products";
import {
  createSale,
  getSalesRange,
  getTodaySales,
  voidSale,
  refundSale,
} from "../api/sales";
import BackToDashboard from "../components/BackToDashboard";
import { useAuth } from "../context/AuthContext";
import { buildReceiptHtml, printReceipt } from "../utils/printReceipt";
import { getSettings } from "../api/settings";

// helpers fecha
const pad2 = (n) => String(n).padStart(2, "0");
const toYMD = (d) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const startOfWeekMonday = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const startOfMonth = (date) => {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

const money = (n) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(
    Number(n || 0)
  );

const extractSaleDoc = (resp) => resp?.data ?? resp;

export default function Sales() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  // =========================
  // ✅ Multiple carts (pestañas)
  // =========================
  const STORAGE_KEY = `pos:carts:${user?.email || "anon"}`;

  const safeJsonParse = (str) => {
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  };

  const clearDraft = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  const saveDraft = (cartsData, activeId) => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          carts: cartsData,
          activeCartId: activeId,
          updatedAt: new Date().toISOString(),
        })
      );
    } catch {}
  };

  // =========================
  // State
  // =========================
  const [products, setProducts] = useState([]);
  const [q, setQ] = useState("");
  const [quick, setQuick] = useState("");

  // ✅ Múltiples carritos
  const [carts, setCarts] = useState([]);
  const [activeCartId, setActiveCartId] = useState(null);
  const cartsRef = useRef([]);
  const activeCartIdRef = useRef(null);

  useEffect(() => {
    cartsRef.current = carts;
    activeCartIdRef.current = activeCartId;
  }, [carts, activeCartId]);

  const quickRef = useRef(null);

  const [selling, setSelling] = useState(false);
  const [rowLoading, setRowLoading] = useState({});

  const [period, setPeriod] = useState("today");
  const [showRefunds, setShowRefunds] = useState(false);

  const [summary, setSummary] = useState({
    totalSales: 0,
    totalUnits: 0,
    totalAmount: 0,
  });
  const [salesList, setSalesList] = useState([]);

  const [lastTicket, setLastTicket] = useState(null);

  // ✅ Modal para agregar stock
  const [stockModal, setStockModal] = useState({
    isOpen: false,
    product: null,
    quantity: "",
  });

  // settings de ticket
  const [paperWidth, setPaperWidth] = useState(80);
  const [storeName, setStoreName] = useState("");
  const [storeLine2, setStoreLine2] = useState("");
  const [storeLine3, setStoreLine3] = useState("");
  const [cashierLabel, setCashierLabel] = useState("");

  const playOk = () => {
    try {
      const a = new Audio("/ok.mp3");
      a.play();
    } catch {}
  };

  const playErr = () => {
    try {
      const a = new Audio("/err.mp3");
      a.play();
    } catch {}
  };

  // =========================
  // ✅ Crear nuevo carrito
  // =========================
  const createNewCart = () => {
    const newCart = {
      id: `cart-${Date.now()}`,
      cartItems: [],
      discountPercent: "",
      createdAt: new Date(),
      customerName: "",
    };

    const newCarts = [...carts, newCart];
    setCarts(newCarts);
    setActiveCartId(newCart.id);
    saveDraft(newCarts, newCart.id);
    requestAnimationFrame(() => quickRef.current?.focus());
  };

  // =========================
  // ✅ Obtener carrito activo
  // =========================
  const activeCart = useMemo(
    () => carts.find((c) => c.id === activeCartId),
    [carts, activeCartId]
  );

  // =========================
  // ✅ Cambiar carrito activo
  // =========================
  const switchCart = (cartId) => {
    setActiveCartId(cartId);
    saveDraft(carts, cartId);
    requestAnimationFrame(() => quickRef.current?.focus());
  };

  // =========================
  // ✅ Cerrar carrito
  // =========================
  const closeCart = (cartId) => {
    const newCarts = carts.filter((c) => c.id !== cartId);
    setCarts(newCarts);

    if (activeCartId === cartId) {
      const nextCartId = newCarts[0]?.id || null;
      setActiveCartId(nextCartId);
      saveDraft(newCarts, nextCartId);
    } else {
      saveDraft(newCarts, activeCartId);
    }
  };

  // =========================
  // ✅ Draft restore (al entrar a Ventas)
  // =========================
  useEffect(() => {
    let raw = null;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch {
      raw = null;
    }

    if (!raw) {
      // Si no hay draft, crear un carrito vacío
      createNewCart();
      return;
    }

    const data = safeJsonParse(raw);
    if (!data || !Array.isArray(data.carts)) {
      createNewCart();
      return;
    }

    setCarts(data.carts);
    setActiveCartId(data.activeCartId || data.carts[0]?.id);
    setQuick("");
    requestAnimationFrame(() => quickRef.current?.focus());
  }, [STORAGE_KEY]);

  // =========================
  // ✅ Draft autosave (mientras agregás/cambiás)
  // =========================
  useEffect(() => {
    if (carts.length === 0) return;

    const hasAnyContent = carts.some((c) => {
      const hasCart = Array.isArray(c.cartItems) && c.cartItems.length > 0;
      const hasDisc =
        String(c.discountPercent ?? "").trim() !== "" &&
        String(c.discountPercent ?? "").trim() !== "-";
      return hasCart || hasDisc;
    });

    if (!hasAnyContent) {
      return;
    }

    saveDraft(carts, activeCartId);
  }, [carts, activeCartId]);

  // =========================
  // Loads
  // =========================
  const loadProducts = async () => {
    const data = await getProducts();
    setProducts(Array.isArray(data) ? data : []);
  };

  const loadSettings = async () => {
    try {
      const s = await getSettings();
      setPaperWidth(Number(s?.receiptWidthMm || 80));
      setStoreName(s?.storeName || "");
      setStoreLine2(s?.storeAddress || "");
      setStoreLine3(s?.storePhone || "");

      const mode = s?.cashierLabelMode || "role";
      const custom = s?.cashierCustomLabel || "Caja";

      const label =
        mode === "none"
          ? ""
          : mode === "email"
          ? user?.email || ""
          : mode === "custom"
          ? custom
          : user?.role === "admin"
          ? "Admin"
          : "Cajero";

      setCashierLabel(label);
    } catch {
      // no rompemos nada si falla
    }
  };

  const loadSummary = async () => {
    const now = new Date();

    if (period === "today") {
      const data = await getTodaySales(showRefunds);
      setSummary({
        totalSales: data?.totalSales || 0,
        totalUnits: data?.totalUnits || 0,
        totalAmount: data?.totalAmount || 0,
      });
      setSalesList(Array.isArray(data?.sales) ? data.sales : []);
      return;
    }

    let from = new Date(now);
    let to = new Date(now);

    if (period === "week") {
      from = startOfWeekMonday(now);
      to = new Date(from);
      to.setDate(to.getDate() + 7);
    } else if (period === "month") {
      from = startOfMonth(now);
      to = new Date(from);
      to.setMonth(to.getMonth() + 1);
    } else if (period === "all") {
      from = new Date("2000-01-01");
      to = new Date("2100-01-01");
    }

    const data = await getSalesRange(toYMD(from), toYMD(to), showRefunds);
    setSummary({
      totalSales: data?.totalSales || 0,
      totalUnits: data?.totalUnits || 0,
      totalAmount: data?.totalAmount || 0,
    });
    setSalesList(Array.isArray(data?.sales) ? data.sales : []);
  };

  useEffect(() => {
    loadProducts();
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, showRefunds]);

  useEffect(() => {
    quickRef.current?.focus();
  }, []);

  // =========================
  // UI Filters
  // =========================
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return products;
    return products.filter((p) =>
      String(p.name || "").toLowerCase().includes(s)
    );
  }, [products, q]);

  // =========================
  // Totals (carrito activo)
  // =========================
  const subtotal = useMemo(() => {
    if (!activeCart) return 0;
    return activeCart.cartItems.reduce((acc, it) => acc + it.qty * it.price, 0);
  }, [activeCart]);

  const discountPercentNum = useMemo(() => {
    if (!activeCart) return 0;
    const v = String(activeCart.discountPercent ?? "").trim();
    if (v === "" || v === "-") return 0;
    const n = Number(v);
    if (!Number.isFinite(n)) return 0;
    return Math.max(-100, Math.min(100, n));
  }, [activeCart]);

  const discountAmount = useMemo(
    () => subtotal * (discountPercentNum / 100),
    [subtotal, discountPercentNum]
  );

  const total = useMemo(
    () => Math.max(0, subtotal - discountAmount),
    [subtotal, discountAmount]
  );

  const totalUnitsCart = useMemo(() => {
    if (!activeCart) return 0;
    return activeCart.cartItems.reduce((acc, it) => acc + Number(it.qty || 0), 0);
  }, [activeCart]);

  // =========================
  // Cart ops (carrito activo)
  // =========================
  const addToCart = (p) => {
    if (!activeCart) return false;

    const stock = Number(p.stock || 0);

    if (stock <= 0) {
      playErr();
      alert("Sin stock");
      return false;
    }

    const prev = activeCart.cartItems || [];
    const idx = prev.findIndex((x) => x._id === p._id);

    let updated;

    if (idx >= 0) {
      const current = prev[idx];
      if (current.qty + 1 > stock) {
        playErr();
        alert("No hay más stock");
        return false;
      }

      updated = prev.map((x, i) =>
        i === idx ? { ...x, qty: x.qty + 1 } : x
      );
    } else {
      updated = [
        ...prev,
        {
          _id: p._id,
          name: p.name,
          price: Number(p.price || 0),
          stock,
          qty: 1,
        },
      ];
    }

    const newCarts = carts.map((c) =>
      c.id === activeCartId
        ? { ...c, cartItems: updated }
        : c
    );

    setCarts(newCarts);
    saveDraft(newCarts, activeCartId);
    playOk();
    return true;
  };

  const setQty = (id, qty) => {
    if (!activeCart) return;

    if (qty === "") {
      const updated = activeCart.cartItems.map((x) =>
        x._id === id ? { ...x, qty: "" } : x
      );

      const newCarts = carts.map((c) =>
        c.id === activeCartId
          ? { ...c, cartItems: updated }
          : c
      );

      setCarts(newCarts);
      saveDraft(newCarts, activeCartId);
      return;
    }

    const n = Number(qty);
    if (!Number.isFinite(n)) return;

    const updated = activeCart.cartItems.map((x) => {
      if (x._id !== id) return x;
      const clamped = Math.max(1, Math.min(x.stock, Math.floor(n)));
      return { ...x, qty: clamped };
    });

    const newCarts = carts.map((c) =>
      c.id === activeCartId
        ? { ...c, cartItems: updated }
        : c
    );

    setCarts(newCarts);
    saveDraft(newCarts, activeCartId);
  };

  const removeItem = (id) => {
    if (!activeCart) return;

    const updated = activeCart.cartItems.filter((x) => x._id !== id);

    const newCarts = carts.map((c) =>
      c.id === activeCartId
        ? { ...c, cartItems: updated }
        : c
    );

    setCarts(newCarts);
    saveDraft(newCarts, activeCartId);
  };

  const clearCart = () => {
    if (!activeCart) return;

    const newCarts = carts.map((c) =>
      c.id === activeCartId
        ? { ...c, cartItems: [], discountPercent: "" }
        : c
    );

    setCarts(newCarts);
    saveDraft(newCarts, activeCartId);
    setQuick("");
    requestAnimationFrame(() => quickRef.current?.focus());
  };

  const addQuick = () => {
    if (!activeCart) return;

    const s = quick.trim();
    if (!s) return;

    const sLower = s.toLowerCase();

    let found = products.find((p) => String(p.barcode || "").trim() === s);

    if (!found) {
      found = products.find(
        (p) => String(p.name || "").trim().toLowerCase() === sLower
      );
    }

    if (!found) {
      const matches = products.filter((p) =>
        String(p.name || "").toLowerCase().includes(sLower)
      );
      if (matches.length === 1) found = matches[0];
      else if (matches.length > 1) {
        playErr();
        alert("Hay varios productos con ese nombre. Usá el buscador.");
        return;
      }
    }

    if (!found) {
      playErr();
      alert("No encontrado");
      return;
    }

    addToCart(found);
    setQuick("");
    quickRef.current?.focus();
  };

  // =========================
  // Update discount
  // =========================
  const updateDiscount = (value) => {
    if (!activeCart) return;

    const newCarts = carts.map((c) =>
      c.id === activeCartId
        ? { ...c, discountPercent: value }
        : c
    );

    setCarts(newCarts);
    saveDraft(newCarts, activeCartId);
  };

  const onBlurDiscount = () => {
    if (!activeCart) return;

    const v = String(activeCart.discountPercent || "").trim();
    if (v === "-") {
      updateDiscount("");
      return;
    }

    if (v === "") return;

    updateDiscount(String(discountPercentNum));
  };

  // =========================
  // ✅ Modal Stock
  // =========================
  const openStockModal = (product) => {
    setStockModal({
      isOpen: true,
      product,
      quantity: "",
    });
  };

  const closeStockModal = () => {
    setStockModal({
      isOpen: false,
      product: null,
      quantity: "",
    });
  };

const confirmAddStock = async () => {
  if (!stockModal.product || !stockModal.quantity) {
    alert("Ingresá una cantidad válida");
    return;
  }

  const qty = Number(stockModal.quantity);

  if (!Number.isFinite(qty) || qty <= 0) {
    alert("La cantidad debe ser mayor a 0");
    return;
  }

  try {
    const updatedProduct = await updateProductStock(
      stockModal.product._id,
      qty
    );

    setProducts((prev) =>
      prev.map((p) =>
        p._id === updatedProduct._id ? updatedProduct : p
      )
    );

    playOk();
    closeStockModal();

  } catch (e) {
    playErr();
    console.error(e);
    alert(e?.response?.data?.message || "Error actualizando stock");
  }
};

  // =========================
  // Confirm + print
  // =========================
  const confirmSale = async () => {
    if (!activeCart || activeCart.cartItems.length === 0) {
      return alert("Carrito vacío");
    }

    setSelling(true);
    try {
      const cartSnapshot = activeCart.cartItems.map((x) => ({
        name: x.name,
        qty: x.qty,
        price: x.price,
      }));

      const items = activeCart.cartItems.map((x) => ({
        product: x._id,
        quantity: x.qty,
        price: x.price,
      }));

      const resp = await createSale(items, discountPercentNum);
      const created = extractSaleDoc(resp);

      setLastTicket({
        saleId: created?._id || "",
        date: created?.createdAt || new Date(),
        cashier: cashierLabel || "",
        items: cartSnapshot,
        total,
        discountPercent: discountPercentNum,
        discountAmount,
        subtotal,
      });

      playOk();
      alert("Venta registrada. Ticket listo para imprimir.");

      // ✅ Cerrar carrito actual
      closeCart(activeCartId);

      await loadProducts();
      await loadSummary();
    } catch (e) {
      playErr();
      alert(e?.response?.data?.message || "Error registrando venta");
    } finally {
      setSelling(false);
      requestAnimationFrame(() => quickRef.current?.focus());
    }
  };

  const onPrintLastTicket = () => {
    if (!lastTicket) return;

    const html = buildReceiptHtml({
      storeName,
      storeLine2,
      storeLine3,
      saleId: lastTicket.saleId || "",
      cashier: lastTicket.cashier || "",
      date: lastTicket.date || new Date(),
      items: lastTicket.items || [],
      total: lastTicket.total || 0,
      widthMm: paperWidth,
      autoPrint: false,
      autoClose: false,
    });

    printReceipt(html, { autoPrint: true, autoClose: true });
  };

  // =========================
  // Void / Refund
  // =========================
  const setRowLoadingFn = (saleId, isLoading) => {
    setRowLoading((prev) => ({ ...prev, [saleId]: isLoading }));
  };

  const onVoidSale = async (sale) => {
    if (!isAdmin) return alert("Solo admin puede anular ventas.");

    const ok = confirm("¿Anular esta venta? Esto devuelve el stock.");
    if (!ok) return;

    const reason = prompt("Motivo (opcional):") || "";

    setRowLoadingFn(sale._id, true);
    try {
      await voidSale(sale._id, reason);
      playOk();
      alert("Venta anulada.");
      await loadProducts();
      await loadSummary();
    } catch (e) {
      playErr();
      alert(e?.response?.data?.message || "No se pudo anular la venta");
    } finally {
      setRowLoadingFn(sale._id, false);
    }
  };

  const onRefundSale = async (sale) => {
    const ok = confirm(
      "¿Registrar devolución de esta venta? Esto devuelve el stock."
    );
    if (!ok) return;

    const reason = prompt("Motivo (opcional):") || "";

    setRowLoadingFn(sale._id, true);
    try {
      await refundSale(sale._id, reason);
      playOk();
      alert("Devolución registrada.");
      await loadProducts();
      await loadSummary();
    } catch (e) {
      playErr();
      alert(e?.response?.data?.message || "No se pudo registrar devolución");
    } finally {
      setRowLoadingFn(sale._id, false);
    }
  };

  // =========================
  // Render
  // =========================
  if (!activeCart) {
    return (
      <div className="app-shell">
        <BackToDashboard />
        <h1>Ventas</h1>
        <button onClick={createNewCart}>Crear primer carrito</button>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <BackToDashboard />
      <h1>Ventas</h1>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr", gap: 14, height: "calc(100vh - 120px)" }}>
        {/* LEFT - SIDEBAR PRODUCTOS */}
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <h3 style={{ marginTop: 0, marginBottom: 10 }}>Productos</h3>

          <div style={{ marginBottom: 10 }}>
            <input
              placeholder="Buscar..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ width: "100%", padding: 8, boxSizing: "border-box" }}
            />
          </div>

          <button 
            onClick={loadProducts}
            style={{ marginBottom: 10, width: "100%" }}
          >
            Refrescar
          </button>

          {/* ✅ LISTA SCROLLEABLE DE PRODUCTOS */}
          <div
            style={{
              flex: 1,
              border: "1px solid var(--border)",
              borderRadius: 12,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                overflowX: "hidden",
              }}
            >
              {filtered.length === 0 ? (
                <div style={{ padding: 12, opacity: 0.7, textAlign: "center" }}>
                  No hay productos
                </div>
              ) : (
                filtered.map((p) => {
                  const stock = Number(p.stock || 0);
                  const disabled = stock <= 0;

                  return (
                    <div
                      key={p._id}
                      style={{
                        padding: 10,
                        borderBottom: "1px solid var(--border)",
                        opacity: disabled ? 0.55 : 1,
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                        {p.name}
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>
                        CB: {p.barcode || "—"}
                      </div>
                      <div style={{ fontSize: 12, marginBottom: 6 }}>
                        <div>{money(p.price)}</div>
                        <div style={{ opacity: 0.8 }}>Stock: {stock}</div>
                      </div>

                      <div style={{ display: "flex", gap: 6, fontSize: 12 }}>
                        <button
                          disabled={disabled}
                          onClick={() => addToCart(p)}
                          style={{ flex: 1, padding: 6 }}
                        >
                          Agregar
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => openStockModal(p)}
                            style={{
                              padding: 6,
                              minWidth: 40,
                              backgroundColor: "var(--primary, #0066cc)",
                              color: "white",
                              border: "none",
                              borderRadius: 4,
                              cursor: "pointer",
                            }}
                            title="Agregar stock"
                          >
                            +📦
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
        

        {/* MIDDLE - ENTRADA RÁPIDA + INFO */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 14 }}>
            <div
              style={{
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: 12,
                minWidth: 200,
              }}
            >
              <div style={{ opacity: 0.8, fontSize: 13 }}>Total carrito</div>
              <div style={{ fontSize: 24, fontWeight: 900 }}>
                {money(total)}
              </div>
              <div style={{ opacity: 0.8, fontSize: 12 }}>Unidades: {totalUnitsCart}</div>
            </div>

            <div
              style={{
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: 12,
                minWidth: 240,
              }}
            >
              <div style={{ opacity: 0.8, fontSize: 13 }}>Resumen período</div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>
                Ventas: {summary.totalSales} • Unid.: {summary.totalUnits}
              </div>
              <div style={{ fontWeight: 900, fontSize: 14, marginTop: 4 }}>
                {money(summary.totalAmount)}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 10 }}>
            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <input
                ref={quickRef}
                placeholder="Código / nombre (Enter)"
                value={quick}
                onChange={(e) => setQuick(e.target.value)}
                onKeyDown={(e) => (e.key === "Enter" ? addQuick() : null)}
                style={{ flex: 1, minWidth: 200 }}
              />
              <button onClick={addQuick}>Agregar</button>
            </div>
          </div>

          {/* ✅ PESTAÑAS DE CARRITOS */}
          <div style={{ marginBottom: 12 }}>
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              {carts.map((c, idx) => {
                const isActive = c.id === activeCartId;
                const itemCount = c.cartItems?.length || 0;

                return (
                  <div
                    key={c.id}
                    onClick={() => switchCart(c.id)}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 6,
                      border: `2px solid ${
                        isActive ? "var(--primary, #0066cc)" : "var(--border, #e0e0e0)"
                      }`,
                      backgroundColor: isActive ? "var(--primary, #0066cc)" : "transparent",
                      color: isActive ? "white" : "black",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontWeight: isActive ? 700 : 500,
                      userSelect: "none",
                      fontSize: 12,
                    }}
                  >
                    <span>C{idx + 1}</span>
                    {itemCount > 0 && (
                      <span
                        style={{
                          backgroundColor: isActive ? "rgba(255,255,255,0.3)" : "var(--border, #e0e0e0)",
                          padding: "1px 4px",
                          borderRadius: 2,
                          fontSize: 11,
                          fontWeight: 900,
                        }}
                      >
                        {itemCount}
                      </span>
                    )}
                    {carts.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          closeCart(c.id);
                        }}
                        style={{
                          padding: "0 2px",
                          border: "none",
                          background: "none",
                          cursor: "pointer",
                          fontSize: 12,
                          color: isActive ? "white" : "black",
                          opacity: 0.7,
                        }}
                        title="Cerrar carrito"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                );
              })}

              <button
                onClick={createNewCart}
                style={{
                  padding: "6px 10px",
                  borderRadius: 6,
                  border: "1px dashed var(--border, #e0e0e0)",
                  background: "transparent",
                  cursor: "pointer",
                  fontWeight: 500,
                  fontSize: 12,
                }}
                title="Crear nuevo carrito"
              >
                ➕
              </button>
            </div>
          </div>

          <h3 style={{ marginTop: 0, marginBottom: 10 }}>Carrito</h3>

{activeCart.cartItems.length === 0 ? (
  <div style={{ opacity: 0.8, textAlign: "center", paddingTop: 20 }}>
    Sin productos
  </div>
) : (
  <div
    style={{
      flex: 1,
      border: "1px solid var(--border)",
      borderRadius: 12,
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      maxHeight: 340, // 👈 ALTURA FIJA para el carrito
      minHeight: 160,
    }}
  >
    <div
      style={{
        flex: 1,
        overflowY: "auto", // 👈 SCROLL PROPIO del carrito
        overflowX: "hidden",
      }}
    >
      {activeCart.cartItems.map((it) => (
        <div
          key={it._id}
          style={{ padding: 10, borderBottom: "1px solid var(--border)" }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 8,
              marginBottom: 6,
            }}
          >
            <div style={{ fontSize: 13 }}>
              <div style={{ fontWeight: 700 }}>{it.name}</div>
              <div style={{ opacity: 0.7, fontSize: 11 }}>
                {money(it.price)} c/u
              </div>
            </div>
            <button onClick={() => removeItem(it._id)} style={{ padding: 4 }}>
              ✕
            </button>
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              fontSize: 12,
            }}
          >
            <span>Cant:</span>
            <input
              type="number"
              max={it.stock}
              value={it.qty}
              onChange={(e) => {
                const v = e.target.value;
                setQty(it._id, v === "" ? "" : Number(v));
              }}
              onBlur={() => {
                const cartItem = activeCart.cartItems.find(
                  (x) => x._id === it._id
                );
                if (cartItem && (cartItem.qty === "" || cartItem.qty <= 0)) {
                  setQty(it._id, 1);
                }
              }}
              style={{ width: 60, padding: 4 }}
            />
            <span style={{ marginLeft: "auto", fontWeight: 700, fontSize: 12 }}>
              {money(it.qty * it.price)}
            </span>
          </div>
        </div>
      ))}
    </div>
  </div>
)}

          <div style={{ marginTop: 12, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 16,
                fontWeight: 900,
                marginBottom: 8,
              }}
            >
              <span>Total</span>
              <span>{money(total)}</span>
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12 }}>
                Desc./Rec. (%)
                <input
                  type="number"
                  min={-100}
                  max={100}
                  step="0.01"
                  value={activeCart.discountPercent}
                  placeholder="0"
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "" || v === "-") return updateDiscount(v);
                    const n = Number(v);
                    if (!Number.isFinite(n)) return;
                    updateDiscount(v);
                  }}
                  onBlur={onBlurDiscount}
                  style={{ width: 70, padding: 4 }}
                />
              </label>

              {discountPercentNum !== 0 && (
                <div style={{ opacity: 0.7, marginTop: 4, fontSize: 11 }}>
                  {discountPercentNum > 0 ? (
                    <>-{money(Math.abs(discountAmount))}</>
                  ) : (
                    <>+{money(Math.abs(discountAmount))}</>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <button
                onClick={clearCart}
                disabled={selling || activeCart.cartItems.length === 0}
                style={{ flex: 1 }}
              >
                Vaciar
              </button>
              <button
                onClick={confirmSale}
                disabled={selling || activeCart.cartItems.length === 0}
                style={{ flex: 1, fontWeight: 700 }}
              >
                {selling ? "Registrando..." : "Confirmar"}
              </button>
            </div>

            {lastTicket && (
              <div
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: 8,
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 4 }}>
                  Ticket listo
                </div>
                <div style={{ opacity: 0.8, fontSize: 11, marginBottom: 6 }}>
                  {money(lastTicket.total)}
                </div>

                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={onPrintLastTicket} style={{ flex: 1, fontSize: 12, padding: 6 }}>
                    Imprimir
                  </button>
                  <button onClick={() => setLastTicket(null)} style={{ flex: 1, fontSize: 12, padding: 6 }}>
                    Cerrar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT - VENTAS DEL PERÍODO */}
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <h3 style={{ marginTop: 0, marginBottom: 10 }}>Ventas del período</h3>

          <div style={{ marginBottom: 10 }}>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              style={{ width: "100%", padding: 8 }}
            >
              <option value="today">Hoy</option>
              <option value="week">Semana</option>
              <option value="month">Mes</option>
              <option value="all">Todo</option>
            </select>
          </div>

          <button onClick={loadSummary} style={{ marginBottom: 10, width: "100%" }}>
            Refrescar
          </button>

          <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12, marginBottom: 10 }}>
            <input
              type="checkbox"
              checked={showRefunds}
              onChange={(e) => setShowRefunds(e.target.checked)}
            />
            Devoluciones
          </label>

          <div style={{ fontSize: 12, marginBottom: 10 }}>
            <div>Ventas: {summary.totalSales}</div>
            <div>Unid.: {summary.totalUnits}</div>
            <div style={{ fontWeight: 700, marginTop: 4 }}>
              Total: {money(summary.totalAmount)}
            </div>
          </div>

          <div
            style={{
              flex: 1,
              border: "1px solid var(--border)",
              borderRadius: 12,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, padding: 8, borderBottom: "1px solid var(--border)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 60px 80px 80px", gap: 6 }}>
                <span>Fecha</span>
                <span>Unid.</span>
                <span>Total</span>
                <span>Acciones</span>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto" }}>
              {salesList.length === 0 ? (
                <div style={{ padding: 10, opacity: 0.7, fontSize: 12, textAlign: "center" }}>
                  Sin ventas
                </div>
              ) : (
                salesList.map((s) => {
                  const dt = new Date(s.createdAt);
                  const when = `${dt.toLocaleDateString()} ${dt
                    .toLocaleTimeString()
                    .slice(0, 5)}`;
                  const loading = !!rowLoading[s._id];

                  return (
                    <div
                      key={s._id}
                      style={{
                        padding: 8,
                        borderBottom: "1px solid var(--border)",
                        opacity: s.isVoided ? 0.5 : 1,
                        fontSize: 11,
                      }}
                    >
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 60px 80px 80px", gap: 6, alignItems: "center", marginBottom: 4 }}>
                        <span>{when}</span>
                        <span>{s.totalUnits || 0}</span>
                        <span>{money(s.total || 0)}</span>
                        <div style={{ display: "flex", gap: 3 }}>
                          <button
                            disabled={loading || s.isVoided}
                            onClick={() => onRefundSale(s)}
                            style={{ flex: 1, padding: 3, fontSize: 10 }}
                          >
                            Dev
                          </button>
                          <button
                            disabled={!isAdmin || loading || s.isVoided}
                            onClick={() => onVoidSale(s)}
                            style={{ flex: 1, padding: 3, fontSize: 10 }}
                          >
                            Anul
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div style={{ marginTop: 8, fontSize: 10, opacity: 0.6 }}>
            * Dev: devolución. Anul: anula (admin)
          </div>
        </div>
      </div>

      {/* ✅ MODAL PARA AGREGAR STOCK */}
      {stockModal.isOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={closeStockModal}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: 12,
              padding: 20,
              minWidth: 320,
              boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginTop: 0, marginBottom: 16 }}>
              Agregar stock
            </h2>

            <div style={{ marginBottom: 16 }}>
              <p style={{ margin: 0, marginBottom: 8, fontWeight: 700 }}>
                {stockModal.product?.name}
              </p>
              <p style={{ margin: 0, marginBottom: 8, opacity: 0.7 }}>
                Stock actual: {stockModal.product?.stock || 0}
              </p>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 700 }}>
                Cantidad a agregar
              </label>
              <input
                type="number"
                min="1"
                value={stockModal.quantity}
                onChange={(e) =>
                  setStockModal({ ...stockModal, quantity: e.target.value })
                }
                placeholder="0"
                autoFocus
                onKeyDown={(e) =>
                  e.key === "Enter" ? confirmAddStock() : null
                }
                style={{
                  width: "100%",
                  padding: 10,
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  boxSizing: "border-box",
                  fontSize: 16,
                }}
              />
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={closeStockModal}
                style={{ flex: 1, backgroundColor: "transparent", border: "1px solid var(--border)" }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmAddStock}
                style={{
                  flex: 1,
                  backgroundColor: "var(--primary, #0066cc)",
                  color: "white",
                  border: "none",
                  fontWeight: 700,
                }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}