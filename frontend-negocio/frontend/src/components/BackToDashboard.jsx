import { useNavigate } from "react-router-dom";

export default function BackToDashboard({ label = "Volver" }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate("/")}
      style={{ marginBottom: 12 }}
    >
      ← {label}
    </button>
  );
}