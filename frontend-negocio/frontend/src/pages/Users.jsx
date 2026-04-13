import { useEffect, useState } from "react";
import BackToDashboard from "../components/BackToDashboard";
import { getUsers, createUser, updateUser, resetUserPassword } from "../api/users";
import { useAuth } from "../context/AuthContext";

export default function Users() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("cashier");

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const data = await getUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(e?.response?.data?.message || "No se pudo cargar usuarios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onCreate = async () => {
    if (!email || !password) return alert("Completa email y contraseña");
    try {
      await createUser({ email, password, role });
      setEmail("");
      setPassword("");
      setRole("cashier");
      await load();
      alert("Usuario creado");
    } catch (e) {
      alert(e?.response?.data?.message || "No se pudo crear usuario");
    }
  };

  const onToggleActive = async (u) => {
    const ok = confirm(u.isActive === false ? "¿Activar usuario?" : "¿Desactivar usuario?");
    if (!ok) return;
    try {
      await updateUser(u._id, { isActive: !u.isActive });
      await load();
    } catch (e) {
      alert(e?.response?.data?.message || "No se pudo actualizar");
    }
  };

  const onChangeRole = async (u, newRole) => {
    try {
      await updateUser(u._id, { role: newRole });
      await load();
    } catch (e) {
      alert(e?.response?.data?.message || "No se pudo cambiar rol");
    }
  };

  const onResetPass = async (u) => {
    const p = prompt(`Nueva contraseña para ${u.email}:`);
    if (!p) return;
    try {
      await resetUserPassword(u._id, p);
      alert("Contraseña actualizada");
    } catch (e) {
      alert(e?.response?.data?.message || "No se pudo cambiar contraseña");
    }
  };

  if (!isAdmin) {
    return (
      <div>
        <BackToDashboard />
        <h1>Usuarios</h1>
        <p>No autorizado.</p>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <BackToDashboard />
      <h1>Usuarios</h1>

      <div style={{ border: "1px solid #ccc", padding: 12, borderRadius: 8, maxWidth: 520 }}>
        <h3 style={{ marginTop: 0 }}>Crear cajero / admin</h3>
        <div style={{ display: "grid", gap: 8 }}>
          <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input
            placeholder="Contraseña"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="cashier">cashier</option>
            <option value="admin">admin</option>
          </select>
          <button onClick={onCreate}>Crear usuario</button>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>Listado</h3>
          <button onClick={load}>Refrescar</button>
        </div>

        {err ? <p>{err}</p> : null}
        {loading ? (
          <p>Cargando...</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 10 }}>
            <thead>
              <tr style={{ textAlign: "left" }}>
                <th style={{ borderBottom: "1px solid #ccc", padding: 8 }}>Email</th>
                <th style={{ borderBottom: "1px solid #ccc", padding: 8 }}>Rol</th>
                <th style={{ borderBottom: "1px solid #ccc", padding: 8 }}>Estado</th>
                <th style={{ borderBottom: "1px solid #ccc", padding: 8 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id} style={{ opacity: u.isActive === false ? 0.6 : 1 }}>
                  <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>{u.email}</td>

                  <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>
                    <select value={u.role} onChange={(e) => onChangeRole(u, e.target.value)}>
                      <option value="cashier">cashier</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>

                  <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>
                    {u.isActive === false ? "Desactivado" : "Activo"}
                  </td>

                  <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button onClick={() => onToggleActive(u)}>
                        {u.isActive === false ? "Activar" : "Desactivar"}
                      </button>
                      <button onClick={() => onResetPass(u)}>Reset pass</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
