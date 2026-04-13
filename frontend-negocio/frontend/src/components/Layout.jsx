

import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const onLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">Sistema</div>

        <nav className="nav">
          <NavLink to="/" end className="navlink">
            Dashboard
          </NavLink>
          <NavLink to="/products" className="navlink">
            Productos
          </NavLink>
          {user?.role === "admin" && (
            <NavLink to="/categories" className="navlink">
              Categorías
            </NavLink>
            
          )}
        </nav>
        <NavLink to="/sales" className="navlink">Ventas</NavLink>
        <NavLink to="/purchases" className="navlink">Compras</NavLink>
        <NavLink to="/stock" className="navlink">Stock</NavLink>
        <NavLink to="/cash" className="navlink">Caja</NavLink>



        <div className="sidebar-footer">
          <div className="userline">
            <div className="u-email">{user?.email || "—"}</div>
            <div className="u-role">{user?.role || ""}</div>
          </div>
          <button onClick={onLogout}>Cerrar sesión</button>
        </div>
      </aside>

      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
