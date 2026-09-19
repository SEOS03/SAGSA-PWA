import { useNavigate } from "react-router-dom";

// Reemplaza los antiguos enlaces de texto "Volver al panel": un ícono de
// inicio en el encabezado, presente en todas las pantallas protegidas.
export default function IconoInicio() {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      className="encabezado__accion"
      onClick={() => navigate("/panel")}
      aria-label="Ir al panel principal"
      title="Ir al panel principal"
    >
      <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 11l9-8 9 8" />
        <path d="M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10" />
      </svg>
    </button>
  );
}
