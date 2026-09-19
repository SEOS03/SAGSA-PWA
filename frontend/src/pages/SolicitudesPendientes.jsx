import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
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

export default function SolicitudesPendientes() {
  const { usuario, listarSolicitudesPendientes, aprobarSolicitud, rechazarSolicitud } = useAuth();
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [procesando, setProcesando] = useState(null);

  const cargar = useCallback(async () => {
    setError("");
    try {
      const datos = await listarSolicitudesPendientes();
      setSolicitudes(datos.solicitudes);
      // Al ver la lista, se marcan como vistas: el aviso "!" desaparece
      // hasta que aparezca una solicitud pendiente nueva.
      marcarComoVistas(usuario.id, datos.solicitudes);
    } catch (err) {
      setError(err.response?.data?.mensaje || "No se pudieron cargar las solicitudes.");
    } finally {
      setCargando(false);
    }
  }, [listarSolicitudesPendientes, usuario]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function manejarAprobar(solicitud) {
    setError("");
    setMensaje("");
    setProcesando(solicitud.id);
    try {
      const datos = await aprobarSolicitud(solicitud.id);
      setMensaje(datos.mensaje);
      cargar();
    } catch (err) {
      setError(err.response?.data?.mensaje || "No se pudo aprobar la solicitud.");
    } finally {
      setProcesando(null);
    }
  }

  async function manejarRechazar(solicitud) {
    const motivo = window.prompt("Motivo del rechazo (opcional):", "");
    if (motivo === null) return;

    setError("");
    setMensaje("");
    setProcesando(solicitud.id);
    try {
      const datos = await rechazarSolicitud(solicitud.id, motivo);
      setMensaje(datos.mensaje);
      cargar();
    } catch (err) {
      setError(err.response?.data?.mensaje || "No se pudo rechazar la solicitud.");
    } finally {
      setProcesando(null);
    }
  }

  return (
    <>
      <Encabezado subtitulo="Solicitudes pendientes" />
      <div className="pagina">
        <div className="contenedor-ancho">
          <h1>Solicitudes pendientes</h1>
          <p className="subtitulo">Cambios propuestos por administradores, a la espera de tu aprobación.</p>

          {mensaje && <p className="mensaje-exito">{mensaje}</p>}
          {error && <p className="mensaje-error">{error}</p>}

          {cargando ? (
            <p className="subtitulo">Cargando solicitudes...</p>
          ) : solicitudes.length === 0 ? (
            <p className="subtitulo">No hay solicitudes pendientes.</p>
          ) : (
            <div className="lista-recursos">
              {solicitudes.map((solicitud) => (
                <div key={solicitud.id} className="tarjeta-solicitud">
                  <div className="tarjeta-recurso__cabecera">
                    <span className="tarjeta-recurso__matricula">
                      {solicitud.Recurso?.matricula || `Recurso #${solicitud.recursoId}`}
                    </span>
                    <span className="estado-badge estado-badge--pendiente">Pendiente</span>
                  </div>
                  <p className="tarjeta-recurso__modelo">{ETIQUETAS_ACCION[solicitud.tipoAccion]}</p>
                  <p className="subtitulo">{describirDatos(solicitud)}</p>
                  <p className="subtitulo">
                    Solicitado por: <strong>{solicitud.solicitante?.nombre || "—"}</strong>
                    {" · "}
                    {new Date(solicitud.fechaSolicitud).toLocaleString()}
                  </p>

                  <div className="tarjeta-recurso__acciones-admin">
                    <button
                      type="button"
                      className="btn-chip"
                      disabled={procesando === solicitud.id}
                      onClick={() => manejarAprobar(solicitud)}
                    >
                      Aprobar
                    </button>
                    <button
                      type="button"
                      className="btn-chip btn-chip--peligro"
                      disabled={procesando === solicitud.id}
                      onClick={() => manejarRechazar(solicitud)}
                    >
                      Rechazar
                    </button>
                  </div>
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
