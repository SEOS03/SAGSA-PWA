import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import RutaProtegida from "./RutaProtegida";

export default function RutaSoloSuperAdmin({ children }) {
  const { usuario } = useAuth();

  return (
    <RutaProtegida>
      {usuario?.esSuperAdmin ? children : <Navigate to="/panel" replace />}
    </RutaProtegida>
  );
}
