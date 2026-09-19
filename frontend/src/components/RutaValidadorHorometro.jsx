import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import RutaProtegida from "./RutaProtegida";

// Super admin siempre puede validar; un administrador regular solo si tiene
// el permiso puedeValidarHorometro otorgado.
export default function RutaValidadorHorometro({ children }) {
  const { usuario } = useAuth();
  const puedeAcceder = usuario?.esSuperAdmin || usuario?.puedeValidarHorometro;

  return <RutaProtegida>{puedeAcceder ? children : <Navigate to="/panel" replace />}</RutaProtegida>;
}
