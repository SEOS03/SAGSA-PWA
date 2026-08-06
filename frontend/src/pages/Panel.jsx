import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Panel() {
  const { usuario, cerrarSesion } = useAuth();
  const navigate = useNavigate();

  function manejarSalida() {
    cerrarSesion();
    navigate("/login");
  }

  return (
    <div className="contenedor-panel">
      <h1>Bienvenido, {usuario?.nombre}</h1>
      <p>
        Rol: <strong>{usuario?.rol}</strong>
      </p>
      <p className="nota">
        Este panel es un punto de partida. Los módulos de aeronaves, programación de vuelos y
        reportes se irán agregando aquí en los siguientes sprints.
      </p>
      <button onClick={manejarSalida}>Cerrar sesión</button>
    </div>
  );
}
