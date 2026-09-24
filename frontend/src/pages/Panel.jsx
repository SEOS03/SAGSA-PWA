import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import Encabezado from "../components/Encabezado";
import CalendarioSemanal from "../components/CalendarioSemanal";

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
        <div className="contenedor-ancho">
          <div className="panel-cabecera">
            <div>
              <h1>Bienvenido, {usuario?.nombre}</h1>
              <p className="subtitulo">Rol: {usuario?.rol}</p>
            </div>
            <button type="button" className="btn-chip btn-chip--secundario" onClick={manejarSalida}>
              Cerrar sesión
            </button>
          </div>

          <CalendarioSemanal />
        </div>
      </div>
    </>
  );
}
