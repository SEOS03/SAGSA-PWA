import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import RutaProtegida from "./RutaProtegida";

export default function RutaSoloInstructor({ children }) {
  const { usuario } = useAuth();

  return <RutaProtegida>{usuario?.rol === "instructor" ? children : <Navigate to="/panel" replace />}</RutaProtegida>;
}
