import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Encabezado from "../components/Encabezado";
import { ETIQUETAS_ESTADO } from "../components/TarjetaRecurso";

const ETIQUETAS_ACCION = {
  cambiar_estado: "Cambiar estado",
  registrar_mantenimiento: "Registrar mantenimiento",
  finalizar_mantenimiento: "Finalizar mantenimiento",
  actualizar_horas: "Actualizar horas",
};

const ETIQUETAS_ESTADO_SOLICITUD = {
  pendiente: "Pendiente",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
};

function describirDatos(solicitud) {
  const datos = solicitud.datosPropuestos || {};
  switch (solicitud.tipoAccion) {
    case "cambiar_estado":
      return `Nuevo estado: ${ETIQUETAS_ESTADO[datos.estado] || datos.estado}`;
    case "actualizar_horas":
      return `Nuevas horas acumuladas: ${datos.horasAcumuladas}`;
    case "registrar_mantenimiento":
      return `Tipo: ${datos.tipoMantenimiento} — Inicio: ${new Date(datos.fechaInicio).toLocaleDateString()}`;
    case "finalizar_mantenimiento":
      return `Mantenimiento #${datos.mantenimientoId}${datos.horasActuales ? ` — Horas: ${datos.horasActuales}` : ""}`;
    default:
      return "";
  }
}

export default function MisSolicitudes() {
  const { listarMisSolicitudes } = useAuth();
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    setError("");
    try {
      const datos = await listarMisSolicitudes();
      setSolicitudes(datos.solicitudes);
    } catch (err) {
      setError(err.response?.data?.mensaje || "No se pudieron cargar tus solicitudes.");
    } finally {
      setCargando(false);
    }
  }, [listarMisSolicitudes]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return (
    <>
      <Encabezado subtitulo="Mis solicitudes" />
      <div className="pagina">
        <div className="contenedor-ancho">
          <h1>Mis solicitudes</h1>
          <p className="subtitulo">Estado de los cambios que has propuesto sobre los recursos.</p>

          {error && <p className="mensaje-error">{error}</p>}

          {cargando ? (
            <p className="subtitulo">Cargando solicitudes...</p>
          ) : solicitudes.length === 0 ? (
            <p className="subtitulo">Todavía no has enviado ninguna solicitud.</p>
          ) : (
            <div className="lista-recursos">
              {solicitudes.map((solicitud) => (
                <div key={solicitud.id} className="tarjeta-solicitud">
                  <div className="tarjeta-recurso__cabecera">
                    <span className="tarjeta-recurso__matricula">
                      {solicitud.Recurso?.matricula || `Recurso #${solicitud.recursoId}`}
                    </span>
                    <span className={`estado-badge estado-badge--solicitud-${solicitud.estado}`}>
                      {ETIQUETAS_ESTADO_SOLICITUD[solicitud.estado]}
                    </span>
                  </div>
                  <p className="tarjeta-recurso__modelo">{ETIQUETAS_ACCION[solicitud.tipoAccion]}</p>
                  <p className="subtitulo">{describirDatos(solicitud)}</p>
                  <p className="subtitulo">{new Date(solicitud.fechaSolicitud).toLocaleString()}</p>
                  {solicitud.estado === "rechazada" && solicitud.motivoRechazo && (
                    <p className="mensaje-error">Motivo: {solicitud.motivoRechazo}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          <p className="enlace-secundario">
            <Link to="/panel/recursos">Volver a recursos</Link>
          </p>
        </div>
      </div>
    </>
  );
}
