import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleRoute from "./components/RoleRoute";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Sales from "./pages/Sales";
import Purchases from "./pages/Purchases";
import Stock from "./pages/Stock";
import Categories from "./pages/Categories";
import Cash from "./pages/Cash";
import "./styles/layout.css";
import "./styles/dark.css";
import Reports from "./pages/Reports";
import Users from "./pages/Users";
import Settings from "./pages/Settings";


export default function App() {
  const hasToken = Boolean(localStorage.getItem("token"));

  return (
    <Routes>
      <Route path="/login" element={hasToken ? <Navigate to="/" /> : <Login />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/products"
        element={
          <ProtectedRoute>
            <Products />
          </ProtectedRoute>
        }
      />

      <Route
        path="/sales"
        element={
          <ProtectedRoute>
            <Sales />
          </ProtectedRoute>
        }
      />

      <Route
        path="/purchases"
        element={
          <ProtectedRoute>
            <Purchases />
          </ProtectedRoute>
        }
      />

      <Route
        path="/stock"
        element={
          <ProtectedRoute>
            <Stock />
          </ProtectedRoute>
        }
      />

      <Route
        path="/cash"
        element={
          <ProtectedRoute>
            <Cash />
          </ProtectedRoute>
        }
      />

      <Route
        path="/categories"
        element={
          <ProtectedRoute>
            <RoleRoute roles={["admin"]}>
              <Categories />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
  path="/reports"
  element={
    <ProtectedRoute>
      <RoleRoute roles={["admin"]}>
        <Reports />
      </RoleRoute>
    </ProtectedRoute>
  }
/>
<Route
  path="/users"
  element={
    <ProtectedRoute>
      <RoleRoute roles={["admin"]}>
        <Users />
      </RoleRoute>
    </ProtectedRoute>
  }
/>
<Route
  path="settings"
  element={
    <RoleRoute roles={["admin"]}>
      <Settings />
    </RoleRoute>
  }
/>
      
      

      <Route path="*" element={<Navigate to={hasToken ? "/" : "/login"} />} />
      
    </Routes>
  );
}
