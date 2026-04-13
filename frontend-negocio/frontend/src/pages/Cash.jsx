import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import BackToDashboard from "../components/BackToDashboard";
import { useAuth } from "../context/AuthContext";
import { closeCashToday, getCashClosuresRange, getCashToday } from "../api/cash";

const money = (n) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(Number(n || 0));

const pad2 = (n) => String(n).padStart(2, "0");
const toYMD = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

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

export default function Cash() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const navigate = useNavigate();

  const mainBtnRef = useRef(null);

  const [today, setToday] = useState(null);
  const [loadingToday, setLoadingToday] = useState(true);

  const [closing, setClosing] = useState(false);

  const [period, setPeriod] = useState("week"); // week | month | custom
  const [from, setFrom] = useState(toYMD(startOfWeekMonday(new Date())));
  const [to, setTo] = useState(toYMD(new Date()));
  const [history, setHistory] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // banners
  const [errorMsg, setErrorMsg] = useState("");
  const [infoMsg, setInfoMsg] = useState("");

  const sales = today?.sales || { totalSales: 0, totalItems: 0, totalAmount: 0 };
  const purchases = today?.purchases || { totalPurchases: 0, totalPurchaseAmount: 0 };

  const canClose = useMemo(() => {
    if (!isAdmin) return false;
    if (!today) return false;
    if (today.isClosed) return false;
    return true;
  }, [isAdmin, today]);

  const loadToday = async () => {
    setLoadingToday(true);
    setErrorMsg("");
    setInfoMsg("");
    try {
      const data = await getCashToday();
      setToday(data);
    } catch (e) {
      setToday(null);
      setErrorMsg(e?.response?.data?.message || "No se pudo cargar la caja de hoy");
    } finally {
      setLoadingToday(false);
    }
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    setErrorMsg("");
    setInfoMsg("");
    try {
      const data = await getCashClosuresRange(from, to);
      setHistory(data);
    } catch (e) {
      setHistory(null);
      setErrorMsg(e?.response?.data?.message || "No se pudo cargar el historial");
    } finally {
      setLoadingHistory(false);
    }
  };

  const refreshAll = async () => {
    await Promise.all([loadToday(), loadHistory()]);
    setInfoMsg("Actualizado.");
    setTimeout(() => setInfoMsg(""), 1200);
  };

  useEffect(() => {
    loadToday();
  }, []);

  useEffect(() => {
    const now = new Date();
    if (period === "week") {
      setFrom(toYMD(startOfWeekMonday(now)));
      setTo(toYMD(now));
    }
    if (period === "month") {
      setFrom(toYMD(startOfMonth(now)));
      setTo(toYMD(now));
    }
  }, [period]);

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  // foco en el botón principal
  useEffect(() => {
    mainBtnRef.current?.focus();
  }, [canClose, loadingToday, loadingHistory]);

  // Atajos teclado:
  // R refrescar
  // Esc volver
  // Ctrl+Enter cerrar (si admin)
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") {
        navigate("/");
        return;
      }
      if (e.key.toLowerCase() === "r") {
        refreshAll();
        return;
      }
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        if (canClose) onClose();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canClose, from, to, period, today]);

  const onClose = async () => {
    if (!canClose) return;

    // Confirmación “inteligente”
    const msg =
      `Vas a cerrar la caja de HOY con:\n\n` +
      `Ventas: ${sales.totalSales} | Unidades: ${sales.totalItems} | Total: ${money(sales.totalAmount)}\n` +
      `Compras: ${purchases.totalPurchases} | Total: ${money(purchases.totalPurchaseAmount)}\n\n` +
      `¿Confirmás el cierre?`;

    const ok = confirm(msg);
    if (!ok) return;

    setClosing(true);
    setErrorMsg("");
    setInfoMsg("");
    try {
      await closeCashToday();
      await refreshAll();
      setInfoMsg("Caja cerrada.");
      setTimeout(() => setInfoMsg(""), 1500);
    } catch (e) {
      setErrorMsg(e?.response?.data?.message || "No se pudo cerrar la caja");
    } finally {
      setClosing(false);
    }
  };

  return (
    <div className="app-shell" style={{ padding: "16px 20px" }}>
      <BackToDashboard />

      <h1>Caja</h1>

      {/* banners */}
      {errorMsg ? (
        <div style={{ padding: 10, border: "1px solid #ff6666", borderRadius: 8, marginBottom: 10 }}>
          <b>Error:</b> {errorMsg}
        </div>
      ) : null}

      {infoMsg ? (
        <div style={{ padding: 10, border: "1px solid #999", borderRadius: 8, marginBottom: 10 }}>
          {infoMsg}
        </div>
      ) : null}

      {/* Resumen del día */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <div style={{ border: "1px solid #333", borderRadius: 10, padding: 12, minWidth: 260 }}>
          <div style={{ opacity: 0.8 }}>Ventas de hoy</div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{money(sales.totalAmount)}</div>
          <div style={{ opacity: 0.75 }}>Ventas: {sales.totalSales}</div>
          <div style={{ opacity: 0.75 }}>Unidades: {sales.totalItems}</div>
        </div>

        <div style={{ border: "1px solid #333", borderRadius: 10, padding: 12, minWidth: 260 }}>
          <div style={{ opacity: 0.8 }}>Compras de hoy</div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{money(purchases.totalPurchaseAmount)}</div>
          <div style={{ opacity: 0.75 }}>Compras: {purchases.totalPurchases}</div>
        </div>

        <div style={{ border: "1px solid #333", borderRadius: 10, padding: 12, minWidth: 320 }}>
          <div style={{ opacity: 0.8 }}>Estado</div>
          <div style={{ fontSize: 16, fontWeight: 800 }}>
            {today?.isClosed ? "Caja cerrada" : "Caja abierta"}
          </div>

          {today?.isClosed && today?.closure ? (
            <div style={{ opacity: 0.75, marginTop: 6 }}>
              <div>Cerró: <b>{today.closure.closedBy?.email || "—"}</b></div>
              <div>Hora: <b>{new Date(today.closure.createdAt).toLocaleString()}</b></div>
            </div>
          ) : (
            <div style={{ opacity: 0.75, marginTop: 6 }}>Todavía no se registró cierre del día.</div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
            <button
              ref={mainBtnRef}
              onClick={refreshAll}
              disabled={loadingToday || loadingHistory}
              title="Atajo: R"
            >
              {loadingToday || loadingHistory ? "Cargando..." : "Refrescar (R)"}
            </button>

            <button
              onClick={onClose}
              disabled={!canClose || closing}
              title="Atajo: Ctrl+Enter"
            >
              {closing ? "Cerrando..." : "Cerrar caja (Ctrl+Enter)"}
            </button>
          </div>

          {!isAdmin && (
            <div style={{ opacity: 0.6, marginTop: 6 }}>
              * Solo admin puede cerrar caja.
            </div>
          )}
        </div>
      </div>

      {/* Historial */}
      <h3>Historial de cierres</h3>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
        <select value={period} onChange={(e) => setPeriod(e.target.value)}>
          <option value="week">Semana</option>
          <option value="month">Mes</option>
          <option value="custom">Rango</option>
        </select>

        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />

        <button onClick={loadHistory} disabled={loadingHistory}>
          {loadingHistory ? "Cargando..." : "Refrescar historial"}
        </button>
      </div>

      <div style={{ maxHeight: 320, overflow: "auto", border: "1px solid #333", borderRadius: 10 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left" }}>
              <th style={{ borderBottom: "1px solid #333", padding: 8 }}>Fecha</th>
              <th style={{ borderBottom: "1px solid #333", padding: 8 }}>Ventas</th>
              <th style={{ borderBottom: "1px solid #333", padding: 8 }}>Unidades</th>
              <th style={{ borderBottom: "1px solid #333", padding: 8 }}>Total vendido</th>
              <th style={{ borderBottom: "1px solid #333", padding: 8 }}>Compras</th>
              <th style={{ borderBottom: "1px solid #333", padding: 8 }}>Total compras</th>
              <th style={{ borderBottom: "1px solid #333", padding: 8 }}>Cerró</th>
            </tr>
          </thead>
          <tbody>
            {(history?.closures || []).map((c) => (
              <tr key={c._id}>
                <td style={{ borderBottom: "1px solid #222", padding: 8 }}>
                  {new Date(c.date).toLocaleDateString()}
                </td>
                <td style={{ borderBottom: "1px solid #222", padding: 8 }}>{c.totalSales}</td>
                <td style={{ borderBottom: "1px solid #222", padding: 8 }}>{c.totalItems}</td>
                <td style={{ borderBottom: "1px solid #222", padding: 8 }}>{money(c.totalAmount)}</td>
                <td style={{ borderBottom: "1px solid #222", padding: 8 }}>{c.totalPurchases}</td>
                <td style={{ borderBottom: "1px solid #222", padding: 8 }}>{money(c.totalPurchaseAmount)}</td>
                <td style={{ borderBottom: "1px solid #222", padding: 8 }}>{c.closedBy?.email || "—"}</td>
              </tr>
            ))}
            {history?.closures?.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: 12, opacity: 0.8 }}>
                  No hay cierres en el rango seleccionado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 10, opacity: 0.75 }}>
        Atajos: <b>R</b> refrescar | <b>Ctrl+Enter</b> cerrar caja | <b>Esc</b> volver al dashboard
      </div>
    </div>
  );
}
