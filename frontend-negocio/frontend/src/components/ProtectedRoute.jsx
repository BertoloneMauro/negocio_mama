import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { token, loading } = useAuth();

  if (loading) return <div style={{ padding: 20 }}>Cargando...</div>;

  return token ? children : <Navigate to="/login" replace />;
}
