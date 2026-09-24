import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import Encabezado from "../components/Encabezado";
import { ETIQUETAS_ESTADO } from "../components/TarjetaRecurso";
import { marcarComoVistas } from "../utils/notificacionesSolicitudes";

const ETIQUETAS_ACCION = {
  cambiar_estado: "Cambiar estado",
  registrar_mantenimiento: "Registrar mantenimiento",
  finalizar_mantenimiento: "Finalizar mantenimiento",
  actualizar_horas: "Actualizar horas",
};

const ETIQUETAS_ESTADO_SOLICITUD = {
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

// Reemplaza a la antigua "Mis solicitudes": ahora es un historial (solo
// solicitudes ya resueltas) cuyo alcance depende del rol de quien lo ve —
// el filtrado real ocurre en el backend (GET /api/solicitudes), este
// componente solo muestra lo que recibe.
export default function HistorialSolicitudes() {
  const { usuario, listarHistorialSolicitudes } = useAuth();
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    setError("");
    try {
      const datos = await listarHistorialSolicitudes();
      setSolicitudes(datos.solicitudes);
      marcarComoVistas(usuario.id, datos.solicitudes, "solicitudes");
    } catch (err) {
      setError(err.response?.data?.mensaje || "No se pudo cargar el historial de solicitudes.");
    } finally {
      setCargando(false);
    }
  }, [listarHistorialSolicitudes, usuario]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return (
    <>
      <Encabezado subtitulo="Historial de solicitudes" />
      <div className="pagina">
        <div className="contenedor-ancho">
          <h1>Historial de solicitudes</h1>
          <p className="subtitulo">Solicitudes ya resueltas (aprobadas o rechazadas).</p>

          {error && <p className="mensaje-error">{error}</p>}

          {cargando ? (
            <p className="subtitulo">Cargando historial...</p>
          ) : solicitudes.length === 0 ? (
            <p className="subtitulo">Todavía no hay solicitudes resueltas.</p>
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
                  <p className="subtitulo">
                    Solicitado por: <strong>{solicitud.solicitante?.nombre || "—"}</strong>
                    {" · "}
                    {new Date(solicitud.fechaSolicitud).toLocaleString()}
                  </p>
                  <p className="subtitulo">
                    Revisado por: <strong>{solicitud.revisor?.nombre || "—"}</strong>
                  </p>
                  {solicitud.estado === "rechazada" && solicitud.motivoRechazo && (
                    <p className="mensaje-error">Motivo: {solicitud.motivoRechazo}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
