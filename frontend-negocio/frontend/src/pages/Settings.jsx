import { useEffect, useState } from "react";
import BackToDashboard from "../components/BackToDashboard";
import { useAuth } from "../context/AuthContext";
import { getSettings, updateSettings } from "../api/settings";

export default function Settings() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const [storeName, setStoreName] = useState("");
  const [storeAddress, setStoreAddress] = useState("");
  const [storePhone, setStorePhone] = useState("");
  const [receiptWidthMm, setReceiptWidthMm] = useState(80);

  const [cashierLabelMode, setCashierLabelMode] = useState("role"); // none|role|email|custom
  const [cashierCustomLabel, setCashierCustomLabel] = useState("Caja");

  // ✅ NUEVO: Tema UI (light/dark)
  const [uiTheme, setUiTheme] = useState(() => localStorage.getItem("uiTheme") || "light");

  const applyTheme = (t) => {
    const theme = t === "dark" ? "dark" : "light";
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("uiTheme", theme);
  };

  // aplica cada vez que cambia en UI
  useEffect(() => {
    applyTheme(uiTheme);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uiTheme]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const s = await getSettings();

        setStoreName(s?.storeName || "");
        setStoreAddress(s?.storeAddress || "");
        setStorePhone(s?.storePhone || "");
        setReceiptWidthMm(Number(s?.receiptWidthMm || 80));
        setCashierLabelMode(s?.cashierLabelMode || "role");
        setCashierCustomLabel(s?.cashierCustomLabel || "Caja");

        // ✅ si viene de backend, lo usamos; si no, dejamos lo que haya en localStorage
        const themeFromServer = s?.uiTheme;
        if (themeFromServer === "dark" || themeFromServer === "light") {
          setUiTheme(themeFromServer);
          applyTheme(themeFromServer);
        } else {
          applyTheme(localStorage.getItem("uiTheme") || "light");
        }
      } catch (e) {
        setErr(e?.response?.data?.message || "No se pudo cargar configuración");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSave = async () => {
    setMsg("");
    setErr("");
    try {
      await updateSettings({
        storeName: storeName.trim(),
        storeAddress: storeAddress.trim(),
        storePhone: storePhone.trim(),
        receiptWidthMm: Number(receiptWidthMm),
        cashierLabelMode,
        cashierCustomLabel: cashierCustomLabel.trim(),

        // ✅ NUEVO
        uiTheme,
      });

      applyTheme(uiTheme);
      setMsg("Guardado ✅");
    } catch (e) {
      setErr(e?.response?.data?.message || "No se pudo guardar");
    }
  };

  if (!isAdmin) {
    return (
      <div>
        <BackToDashboard />
        <h1>Configuración</h1>
        <div style={{ opacity: 0.85 }}>Acceso denegado (solo admin).</div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <BackToDashboard />
      <h1>Configuración del negocio</h1>

      {loading ? <div>Cargando...</div> : null}
      {err ? <div style={{ marginTop: 8, color: "crimson" }}>{err}</div> : null}
      {msg ? <div style={{ marginTop: 8 }}>{msg}</div> : null}

      <div style={{ display: "grid", gap: 10, maxWidth: 520, marginTop: 12 }}>
        {/* ✅ NUEVO: Apariencia */}
        <div style={{ border: "1px solid #333", borderRadius: 12, padding: 10 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Apariencia</div>

          <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <b>Modo oscuro</b>
            <input
              type="checkbox"
              checked={uiTheme === "dark"}
              onChange={(e) => setUiTheme(e.target.checked ? "dark" : "light")}
            />
          </label>

          <div style={{ marginTop: 6, opacity: 0.75, fontSize: 12 }}>
            Se guarda en Configuración y también en este dispositivo (localStorage).
          </div>
        </div>

        <label style={{ display: "grid", gap: 6 }}>
          <b>Nombre del negocio</b>
          <input value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="Ej: Kiosco San Juan" />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <b>Dirección</b>
          <input value={storeAddress} onChange={(e) => setStoreAddress(e.target.value)} placeholder="Ej: Av. Siempre Viva 123" />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <b>Teléfono</b>
          <input value={storePhone} onChange={(e) => setStorePhone(e.target.value)} placeholder="Ej: 11-5555-5555" />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <b>Ancho ticket</b>
          <select value={receiptWidthMm} onChange={(e) => setReceiptWidthMm(Number(e.target.value))}>
            <option value={80}>80mm</option>
            <option value={58}>58mm</option>
          </select>
        </label>

        <div style={{ border: "1px solid #333", borderRadius: 12, padding: 10 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Texto “Cajero” en ticket</div>

          <label style={{ display: "grid", gap: 6 }}>
            <b>Modo</b>
            <select value={cashierLabelMode} onChange={(e) => setCashierLabelMode(e.target.value)}>
              <option value="none">No mostrar</option>
              <option value="role">Mostrar rol (Admin / Cajero)</option>
              <option value="email">Mostrar email</option>
              <option value="custom">Texto fijo (ej: Caja 1)</option>
            </select>
          </label>

          {cashierLabelMode === "custom" ? (
            <label style={{ display: "grid", gap: 6, marginTop: 10 }}>
              <b>Texto fijo</b>
              <input value={cashierCustomLabel} onChange={(e) => setCashierCustomLabel(e.target.value)} placeholder="Ej: Caja 1" />
            </label>
          ) : null}
        </div>

        <button onClick={onSave} disabled={loading} style={{ marginTop: 4 }}>
          Guardar
        </button>
      </div>
    </div>
  );
}
