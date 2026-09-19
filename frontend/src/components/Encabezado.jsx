import { useAuth } from "../context/AuthContext";
import PanelLateral from "./PanelLateral";
import IconoInicio from "./IconoInicio";
import IconoNotificacionSolicitudes from "./IconoNotificacionSolicitudes";

export default function Encabezado({ subtitulo }) {
  const { usuario } = useAuth();

  return (
    <header className="encabezado">
      {usuario && <PanelLateral />}

      <div className="encabezado__marca">
        <img
          src="/branding/sagsa_logo.jpg"
          alt="Escudo Sagsa Academy"
          className="encabezado__logo"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
        <div className="encabezado__texto">
          <span className="encabezado__titulo">Sagsa Academy</span>
          {subtitulo && <span className="encabezado__subtitulo">{subtitulo}</span>}
        </div>
      </div>

      {usuario && (
        <div className="encabezado__acciones">
          <IconoInicio />
          <IconoNotificacionSolicitudes />
        </div>
      )}
    </header>
  );
}
