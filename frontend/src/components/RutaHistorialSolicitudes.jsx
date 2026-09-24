import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import RutaProtegida from "./RutaProtegida";

export default function RutaHistorialSolicitudes({ children }) {
  const { usuario } = useAuth();

  return (
    <RutaProtegida>
      {usuario?.rol === "administrador" || usuario?.rol === "instructor" ? children : <Navigate to="/panel" replace />}
    </RutaProtegida>
  );
}
