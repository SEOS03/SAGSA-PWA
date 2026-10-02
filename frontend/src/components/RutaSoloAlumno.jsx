import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import RutaProtegida from "./RutaProtegida";

export default function RutaSoloAlumno({ children }) {
  const { usuario } = useAuth();

  return <RutaProtegida>{usuario?.rol === "alumno" ? children : <Navigate to="/panel" replace />}</RutaProtegida>;
}
