import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();

  const isAdmin = user?.role === "admin";

  return (
    <div className="app-shell">
      {/* Header card */}
      <div className="card">
        <div className="dash-header">
          <div>
            <h1 className="dash-title">Dashboard</h1>
            <p className="dash-sub">
              Usuario: <b>{user?.email}</b>
            </p>
          </div>

          <div className="role-badge">
            <span>🔐</span>
            <span>
              Rol: <b>{user?.role}</b>
            </span>
          </div>
        </div>
      </div>

      <div className="section-title">Operación</div>

      <div className="dash-grid">
        <Link className="cardlink" to="/sales">
          <div className="icon">🧾</div>
          <div className="label">Ventas</div>
          <div className="desc">Escaneo, ticket e historial</div>
        </Link>

        <Link className="cardlink" to="/purchases">
          <div className="icon">🛒</div>
          <div className="label">Compras</div>
          <div className="desc">Ingreso de mercadería y detalle</div>
        </Link>

        <Link className="cardlink" to="/cash">
          <div className="icon">💰</div>
          <div className="label">Caja</div>
          <div className="desc">Movimientos y control diario</div>
        </Link>

        <Link className="cardlink" to="/stock">
          <div className="icon">📦</div>
          <div className="label">Stock</div>
          <div className="desc">Entradas / salidas / ajustes</div>
        </Link>

        <Link className="cardlink" to="/products">
          <div className="icon">📦</div>
          <div className="label">Productos</div>
          <div className="desc">Alta, precios y códigos</div>
        </Link>

        {isAdmin && (
          <Link className="cardlink" to="/categories">
            <div className="icon">🏷️</div>
            <div className="label">Categorías</div>
            <div className="desc">Organización del catálogo</div>
          </Link>
        )}
      </div>

      {isAdmin && (
        <>
          <div className="section-title">Administración</div>

          <div className="dash-grid">
            <Link className="cardlink" to="/reports">
              <div className="icon">📊</div>
              <div className="label">Reportes</div>
              <div className="desc">Métricas y rendimiento</div>
            </Link>

            <Link className="cardlink" to="/users">
              <div className="icon">👤</div>
              <div className="label">Usuarios</div>
              <div className="desc">Roles y accesos</div>
            </Link>

            <Link className="cardlink" to="/settings">
              <div className="icon">⚙️</div>
              <div className="label">Configuración</div>
              <div className="desc">Preferencias del sistema</div>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
