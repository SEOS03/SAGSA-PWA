import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import Encabezado from "../components/Encabezado";

export default function Panel() {
  const { usuario, cerrarSesion } = useAuth();
  const navigate = useNavigate();

  function manejarSalida() {
    cerrarSesion();
    navigate("/login");
  }

  return (
    <>
      <Encabezado subtitulo="Panel principal" />
      <div className="pagina">
        <div className="contenedor-panel">
          <h1>Bienvenido, {usuario?.nombre}</h1>
          <p>
            Rol: <strong>{usuario?.rol}</strong>
          </p>

          {usuario?.rol === "administrador" && (
            <>
              <p className="enlace-secundario">
                <Link to="/panel/crear-usuario">Crear usuario</Link>
              </p>
              <p className="enlace-secundario">
                <Link to="/panel/buscar-usuario">Buscar usuario por DPI</Link>
              </p>
            </>
          )}

          <p className="nota">
            Este panel es un punto de partida. Los módulos de aeronaves, programación de vuelos y
            reportes se irán agregando aquí en los siguientes sprints.
          </p>
          <button onClick={manejarSalida}>Cerrar sesión</button>
        </div>
      </div>
    </>
  );
}
