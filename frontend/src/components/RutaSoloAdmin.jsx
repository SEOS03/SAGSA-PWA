import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import RutaProtegida from "./RutaProtegida";

export default function RutaSoloAdmin({ children }) {
  const { usuario } = useAuth();

  return (
    <RutaProtegida>
      {usuario?.rol === "administrador" ? children : <Navigate to="/panel" replace />}
    </RutaProtegida>
  );
}
