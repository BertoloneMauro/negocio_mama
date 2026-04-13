import { useEffect, useState } from "react";
import BackToDashboard from "../components/BackToDashboard";
import { getReportDaily, getReportSummary, getTopProducts } from "../api/reports";
import { getLowStock } from "../api/products";

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

const money = (n) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(Number(n || 0));

export default function Reports() {
  const [period, setPeriod] = useState("week"); // today | week | month | custom
  const [from, setFrom] = useState(toYMD(startOfWeekMonday(new Date())));
  const [to, setTo] = useState(toYMD(new Date()));

  const [summary, setSummary] = useState(null);
  const [daily, setDaily] = useState([]);
  const [top, setTop] = useState([]);
  const [low, setLow] = useState([]);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    const now = new Date();
    if (period === "today") {
      setFrom(toYMD(now));
      setTo(toYMD(now));
    }
    if (period === "week") {
      setFrom(toYMD(startOfWeekMonday(now)));
      setTo(toYMD(now));
    }
    if (period === "month") {
      setFrom(toYMD(startOfMonth(now)));
      setTo(toYMD(now));
    }
  }, [period]);

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const [s, d, t, l] = await Promise.all([
        getReportSummary(from, to),
        getReportDaily(from, to),
        getTopProducts(from, to, 10),
        getLowStock()
      ]);
      setSummary(s);
      setDaily(Array.isArray(d) ? d : []);
      setTop(Array.isArray(t) ? t : []);
      setLow(Array.isArray(l) ? l : []);
    } catch (e) {
      setErr(e?.response?.data?.message || "No se pudieron cargar los reportes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  return (
    <div className="app-shell">
      <BackToDashboard />
      <h1>Reportes</h1>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <select value={period} onChange={(e) => setPeriod(e.target.value)}>
          <option value="today">Hoy</option>
          <option value="week">Semana</option>
          <option value="month">Mes</option>
          <option value="custom">Rango</option>
        </select>

        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />

        <button onClick={load} disabled={loading}>
          {loading ? "Cargando..." : "Refrescar"}
        </button>
      </div>

      {err ? <p style={{ color: "crimson" }}>{err}</p> : null}

      <hr />

      <h3>Resumen</h3>
      <p>
        Ventas: <b>{summary?.totalSales ?? 0}</b> | Unidades: <b>{summary?.totalItems ?? 0}</b> | Total:{" "}
        <b>{money(summary?.totalAmount ?? 0)}</b>
      </p>

      <h3>Ventas por día</h3>
      <table>
        <thead>
          <tr>
            <th>Día</th>
            <th>Ventas</th>
            <th>Unidades</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {daily.map((r) => (
            <tr key={r.day}>
              <td>{r.day}</td>
              <td>{r.totalSales}</td>
              <td>{r.totalItems}</td>
              <td>{money(r.totalAmount)}</td>
            </tr>
          ))}
          {daily.length === 0 && (
            <tr>
              <td colSpan={4}>Sin datos</td>
            </tr>
          )}
        </tbody>
      </table>

      <h3>Productos más vendidos</h3>
      <table>
        <thead>
          <tr>
            <th>Producto</th>
            <th>CB</th>
            <th>Unidades</th>
            <th>Importe</th>
          </tr>
        </thead>
        <tbody>
          {top.map((r) => (
            <tr key={r.productId}>
              <td>{r.name || "—"}</td>
              <td>{r.barcode || "—"}</td>
              <td>{r.units}</td>
              <td>{money(r.revenue)}</td>
            </tr>
          ))}
          {top.length === 0 && (
            <tr>
              <td colSpan={4}>Sin datos</td>
            </tr>
          )}
        </tbody>
      </table>

      <h3>Stock bajo</h3>
      <table>
        <thead>
          <tr>
            <th>Producto</th>
            <th>Stock</th>
            <th>Mínimo</th>
          </tr>
        </thead>
        <tbody>
          {low.map((p) => (
            <tr key={p._id}>
              <td>{p.name}</td>
              <td>{p.stock}</td>
              <td>{p.minStock}</td>
            </tr>
          ))}
          {low.length === 0 && (
            <tr>
              <td colSpan={3}>No hay productos con stock bajo</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
