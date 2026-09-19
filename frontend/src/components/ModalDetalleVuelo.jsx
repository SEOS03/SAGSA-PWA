import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";

const ETIQUETAS_ESTADO = {
  en_proceso: "En proceso",
  confirmado: "Confirmado",
  en_curso: "En curso",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};

// El reporte de horómetro se hace después del vuelo, así que para cuando
// alguien lo reporta, el vuelo pudo haber pasado a "en_curso" solo (ver
// backend/src/utils/actualizarEstadoPorHora.js) — se acepta en ambos estados.
const ESTADOS_VUELO_PARA_HOROMETRO = ["confirmado", "en_curso"];

const MOTIVOS_CANCELACION = [
  { valor: "cancelado_por_alumno", etiqueta: "Cancelado por el alumno" },
  { valor: "cancelado_por_instructor", etiqueta: "Cancelado por el instructor" },
  { valor: "cancelado_por_mantenimiento_aeronave", etiqueta: "Cancelado por mantenimiento de la aeronave" },
  { valor: "cancelado_por_clima", etiqueta: "Cancelado por clima" },
  { valor: "otro", etiqueta: "Otro motivo" },
];

function formatoFechaHora(fechaIso) {
  return new Date(fechaIso).toLocaleString("es-GT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// onCambio: se llama tras cualquier acción exitosa para que el calendario de
// fondo (fuera de este modal) refresque sus bloques; el propio modal se
// actualiza en el momento con la respuesta de cada acción, sin cerrarse.
export default function ModalDetalleVuelo({ vuelo: vueloInicial, onCerrar, onCambio }) {
  const {
    usuario,
    obtenerVuelo,
    obtenerRecurso,
    confirmarInstructor,
    confirmarAlumno,
    aprobarVueloSuperAdmin,
    cancelarVuelo,
    registrarHorometroInstructor,
    registrarHorometroAlumno,
    obtenerHorometro,
  } = useAuth();

  const [vuelo, setVuelo] = useState(vueloInicial);
  const [registro, setRegistro] = useState(null);
  const [horasSistemaRecurso, setHorasSistemaRecurso] = useState(null);
  const [cargandoHorometro, setCargandoHorometro] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [mostrarCancelar, setMostrarCancelar] = useState(false);
  const [motivoCancelacion, setMotivoCancelacion] = useState("");

  const [horometroFinal, setHorometroFinal] = useState("");
  const [horasSesion, setHorasSesion] = useState("");
  const [observaciones, setObservaciones] = useState("");

  const idUsuario = Number(usuario?.id);
  const esInstructorAsignado = idUsuario === Number(vuelo.instructorId);
  const esAlumnoAsignado = idUsuario === Number(vuelo.alumnoId);
  const esSuperAdmin = !!usuario?.esSuperAdmin;
  const vueloActivo = vuelo.estado !== "cancelado" && vuelo.estado !== "finalizado";

  const cargarHorometro = useCallback(async () => {
    setCargandoHorometro(true);
    try {
      const datos = await obtenerHorometro(vuelo.id);
      setRegistro(datos.registro);
    } catch (err) {
      if (err.response?.status === 404) {
        setRegistro(null);
      } else {
        setError(err.response?.data?.mensaje || "No se pudo obtener el horómetro.");
      }
    } finally {
      setCargandoHorometro(false);
    }
  }, [vuelo.id, obtenerHorometro]);

  useEffect(() => {
    cargarHorometro();
  }, [cargarHorometro]);

  // Mientras no exista un registro todavía, el "horómetro inicial" de
  // solo lectura se toma directamente de las horas acumuladas actuales del
  // recurso (lo mismo que el backend usará al crear el registro con el
  // primer reporte).
  useEffect(() => {
    if (registro || !ESTADOS_VUELO_PARA_HOROMETRO.includes(vuelo.estado)) return;
    if (!esInstructorAsignado && !esAlumnoAsignado) return;

    obtenerRecurso(vuelo.recursoId)
      .then((datos) => setHorasSistemaRecurso(datos.recurso.horasAcumuladas))
      .catch(() => {});
  }, [registro, vuelo.estado, vuelo.recursoId, esInstructorAsignado, esAlumnoAsignado, obtenerRecurso]);

  const mostrarSeccionHorometro = ["confirmado", "en_curso"].includes(vuelo.estado) || !!registro;

  const yaReportoInstructor = registro?.horometroInicialInstructor != null && registro?.horometroFinalInstructor != null;
  const yaReportoAlumno = registro?.horometroInicialAlumno != null && registro?.horometroFinalAlumno != null;

  const puedeReportar =
    ESTADOS_VUELO_PARA_HOROMETRO.includes(vuelo.estado) &&
    registro?.estado !== "validado" &&
    ((esInstructorAsignado && !yaReportoInstructor) || (esAlumnoAsignado && !yaReportoAlumno));
  const rolReporte = puedeReportar ? (esInstructorAsignado ? "instructor" : "alumno") : null;

  const puedeCancelar =
    vueloActivo && (usuario?.rol === "administrador" || esInstructorAsignado || esAlumnoAsignado);

  async function manejarConfirmar(tipo) {
    setError("");
    setMensaje("");
    setProcesando(true);
    try {
      const datos =
        tipo === "instructor"
          ? await confirmarInstructor(vuelo.id)
          : tipo === "alumno"
          ? await confirmarAlumno(vuelo.id)
          : await aprobarVueloSuperAdmin(vuelo.id);
      // Estos endpoints devuelven el vuelo sin las relaciones incluidas
      // (recurso/instructor/alumno); se fusiona en vez de reemplazar para no
      // perder esos datos ya mostrados (esas relaciones nunca cambian aquí).
      setVuelo((prev) => ({ ...prev, ...datos.vuelo }));
      setMensaje(datos.mensaje);
      onCambio();
    } catch (err) {
      setError(err.response?.data?.mensaje || "No se pudo registrar la confirmación.");
    } finally {
      setProcesando(false);
    }
  }

  async function manejarCancelar() {
    if (!motivoCancelacion) {
      setError("Selecciona un motivo de cancelación.");
      return;
    }
    setError("");
    setMensaje("");
    setProcesando(true);
    try {
      const datos = await cancelarVuelo(vuelo.id, motivoCancelacion);
      setVuelo((prev) => ({ ...prev, ...datos.vuelo }));
      setMensaje(datos.mensaje);
      setMostrarCancelar(false);
      onCambio();
    } catch (err) {
      setError(err.response?.data?.mensaje || "No se pudo cancelar el vuelo.");
    } finally {
      setProcesando(false);
    }
  }

  async function manejarReportarHorometro(e) {
    e.preventDefault();
    setError("");
    setMensaje("");

    const inicial = registro?.horometroInicialSistema ?? horasSistemaRecurso;
    if (inicial === null || inicial === undefined) {
      setError("Todavía no se pudo determinar el horómetro inicial del recurso. Intenta de nuevo en un momento.");
      return;
    }
    if (!horometroFinal || (rolReporte === "instructor" && !horasSesion)) {
      setError(
        rolReporte === "instructor"
          ? "Horómetro final y horas de sesión son obligatorios."
          : "El horómetro final es obligatorio."
      );
      return;
    }

    setProcesando(true);
    try {
      const payload = {
        horometroInicial: Number(inicial),
        horometroFinal: Number(horometroFinal),
        observaciones: observaciones || undefined,
      };
      if (rolReporte === "instructor") payload.horasSesionReportadas = Number(horasSesion);

      const datos =
        rolReporte === "instructor"
          ? await registrarHorometroInstructor(vuelo.id, payload)
          : await registrarHorometroAlumno(vuelo.id, payload);

      setRegistro(datos.registro);
      setMensaje(datos.mensaje);
      setHorometroFinal("");
      setHorasSesion("");
      setObservaciones("");
      onCambio();
    } catch (err) {
      setError(err.response?.data?.mensaje || "No se pudo registrar el horómetro.");
    } finally {
      setProcesando(false);
    }
  }

  const horometroInicialMostrado = registro?.horometroInicialSistema ?? horasSistemaRecurso;

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <div className="modal-caja" onClick={(e) => e.stopPropagation()}>
        <h2>Detalle del vuelo</h2>
        <p className="subtitulo">
          {vuelo.recurso?.matricula || `Recurso #${vuelo.recursoId}`} — {ETIQUETAS_ESTADO[vuelo.estado] || vuelo.estado}
        </p>

        <div className="detalle-vuelo">
          <div className="detalle-vuelo__fila">
            <span className="detalle-vuelo__etiqueta">Fecha y hora</span>
            <span>{formatoFechaHora(vuelo.fechaHora)}</span>
          </div>
          <div className="detalle-vuelo__fila">
            <span className="detalle-vuelo__etiqueta">Duración</span>
            <span>{vuelo.duracionMinutos} minutos</span>
          </div>
          <div className="detalle-vuelo__fila">
            <span className="detalle-vuelo__etiqueta">Instructor</span>
            <span>{vuelo.instructor?.nombre || "—"}</span>
          </div>
          <div className="detalle-vuelo__fila">
            <span className="detalle-vuelo__etiqueta">Alumno</span>
            <span>{vuelo.alumno?.nombre || "—"}</span>
          </div>
          {vuelo.leccionProgramada != null && (
            <div className="detalle-vuelo__fila">
              <span className="detalle-vuelo__etiqueta">Lección programada</span>
              <span>{vuelo.leccionProgramada}</span>
            </div>
          )}
          {vuelo.estado === "cancelado" && vuelo.motivoCancelacion && (
            <div className="detalle-vuelo__fila">
              <span className="detalle-vuelo__etiqueta">Motivo de cancelación</span>
              <span>{MOTIVOS_CANCELACION.find((m) => m.valor === vuelo.motivoCancelacion)?.etiqueta || vuelo.motivoCancelacion}</span>
            </div>
          )}
          {typeof vuelo.prioridadCalculada !== "undefined" && vuelo.prioridadCalculada !== null && (
            <div className="detalle-vuelo__fila">
              <span className="detalle-vuelo__etiqueta">Prioridad</span>
              <span>{vuelo.prioridadCalculada}</span>
            </div>
          )}
        </div>

        <div className="detalle-vuelo__seccion">
          <h3>Confirmaciones</h3>
          <ul className="lista-confirmaciones">
            <li className={`confirmacion-item ${vuelo.confirmacionInstructor ? "confirmacion-item--ok" : ""}`}>
              <span className="confirmacion-item__icono">{vuelo.confirmacionInstructor ? "✓" : "…"}</span>
              Instructor{vuelo.instructor?.nombre ? ` (${vuelo.instructor.nombre})` : ""}
            </li>
            <li className={`confirmacion-item ${vuelo.confirmacionAlumno ? "confirmacion-item--ok" : ""}`}>
              <span className="confirmacion-item__icono">{vuelo.confirmacionAlumno ? "✓" : "…"}</span>
              Alumno{vuelo.alumno?.nombre ? ` (${vuelo.alumno.nombre})` : ""}
            </li>
            <li className={`confirmacion-item ${vuelo.aprobacionSuperAdmin ? "confirmacion-item--ok" : ""}`}>
              <span className="confirmacion-item__icono">{vuelo.aprobacionSuperAdmin ? "✓" : "…"}</span>
              Super administrador
            </li>
          </ul>

          {vueloActivo && esInstructorAsignado && !vuelo.confirmacionInstructor && (
            <button type="button" className="btn-chip" disabled={procesando} onClick={() => manejarConfirmar("instructor")}>
              Confirmar mi participación
            </button>
          )}
          {vueloActivo && esAlumnoAsignado && !vuelo.confirmacionAlumno && (
            <button type="button" className="btn-chip" disabled={procesando} onClick={() => manejarConfirmar("alumno")}>
              Confirmar mi participación
            </button>
          )}
          {vueloActivo && esSuperAdmin && !vuelo.aprobacionSuperAdmin && (
            <button type="button" className="btn-chip" disabled={procesando} onClick={() => manejarConfirmar("superadmin")}>
              Aprobar como super administrador
            </button>
          )}
        </div>

        {mostrarSeccionHorometro && (
          <div className="detalle-vuelo__seccion">
            <h3>Horómetro</h3>

            {cargandoHorometro ? (
              <p className="subtitulo">Cargando información de horómetro...</p>
            ) : registro?.estado === "validado" ? (
              <div className="horometro-resumen">
                <p>
                  Horómetro final aplicado: <strong>{Number(registro.horometroFinalInstructor).toFixed(2)}</strong>
                </p>
                <p>Validado por: <strong>{registro.validador?.nombre || "—"}</strong></p>
                <p>Fecha de validación: {formatoFechaHora(registro.fechaValidacion)}</p>
              </div>
            ) : (
              <>
                {registro?.estado === "pendiente_validacion" && (
                  <p className="mensaje-guia">
                    Este registro está esperando validación del super administrador (o de un administrador autorizado).
                  </p>
                )}

                {rolReporte ? (
                  <form className="formulario-auth" onSubmit={manejarReportarHorometro}>
                    <label>Horómetro inicial</label>
                    <p className="formulario-vuelo__fijo">
                      {horometroInicialMostrado !== null && horometroInicialMostrado !== undefined
                        ? Number(horometroInicialMostrado).toFixed(2)
                        : "Cargando..."}
                    </p>

                    <label htmlFor="horometroFinal">Horómetro final</label>
                    <input
                      id="horometroFinal"
                      type="number"
                      min="0"
                      step="0.1"
                      value={horometroFinal}
                      onChange={(e) => setHorometroFinal(e.target.value)}
                      required
                    />

                    {rolReporte === "instructor" && (
                      <>
                        <label htmlFor="horasSesion">Horas de sesión</label>
                        <input
                          id="horasSesion"
                          type="number"
                          min="0"
                          step="0.1"
                          value={horasSesion}
                          onChange={(e) => setHorasSesion(e.target.value)}
                          required
                        />
                      </>
                    )}

                    <label htmlFor="observaciones">Observaciones (opcional)</label>
                    <textarea
                      id="observaciones"
                      rows={2}
                      value={observaciones}
                      onChange={(e) => setObservaciones(e.target.value)}
                    />

                    <button type="submit" disabled={procesando}>
                      {procesando ? "Enviando..." : "Reportar horómetro"}
                    </button>
                  </form>
                ) : esInstructorAsignado && yaReportoInstructor ? (
                  <div className="horometro-resumen">
                    <p>
                      Tu reporte — inicial: <strong>{Number(registro.horometroInicialInstructor).toFixed(2)}</strong>,
                      final: <strong>{Number(registro.horometroFinalInstructor).toFixed(2)}</strong>, horas de sesión:{" "}
                      <strong>{Number(registro.horasSesionReportadas).toFixed(2)}</strong>
                    </p>
                    <p>Alumno: {yaReportoAlumno ? "ya reportó" : "pendiente de reportar"}</p>
                  </div>
                ) : esAlumnoAsignado && yaReportoAlumno ? (
                  <div className="horometro-resumen">
                    <p>
                      Tu reporte — inicial: <strong>{Number(registro.horometroInicialAlumno).toFixed(2)}</strong>, final:{" "}
                      <strong>{Number(registro.horometroFinalAlumno).toFixed(2)}</strong>
                    </p>
                    <p>Instructor: {yaReportoInstructor ? "ya reportó" : "pendiente de reportar"}</p>
                  </div>
                ) : (
                  <div className="horometro-resumen">
                    <p>Instructor: {yaReportoInstructor ? "ya reportó" : "pendiente de reportar"}</p>
                    <p>Alumno: {yaReportoAlumno ? "ya reportó" : "pendiente de reportar"}</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {puedeCancelar && (
          <div className="detalle-vuelo__seccion">
            {!mostrarCancelar ? (
              <button type="button" className="btn-chip btn-chip--peligro" onClick={() => setMostrarCancelar(true)}>
                Cancelar vuelo
              </button>
            ) : (
              <div className="formulario-auth">
                <label htmlFor="motivoCancelacion">Motivo de cancelación</label>
                <select
                  id="motivoCancelacion"
                  value={motivoCancelacion}
                  onChange={(e) => setMotivoCancelacion(e.target.value)}
                >
                  <option value="">Selecciona un motivo</option>
                  {MOTIVOS_CANCELACION.map((m) => (
                    <option key={m.valor} value={m.valor}>
                      {m.etiqueta}
                    </option>
                  ))}
                </select>

                <div className="modal-caja__acciones">
                  <button
                    type="button"
                    className="btn-chip btn-chip--secundario"
                    disabled={procesando}
                    onClick={() => setMostrarCancelar(false)}
                  >
                    Volver
                  </button>
                  <button
                    type="button"
                    className="btn-chip btn-chip--peligro"
                    disabled={procesando}
                    onClick={manejarCancelar}
                  >
                    {procesando ? "Cancelando..." : "Confirmar cancelación"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {mensaje && <p className="mensaje-exito">{mensaje}</p>}
        {error && <p className="mensaje-error">{error}</p>}

        <div className="modal-caja__acciones">
          <button type="button" className="btn-chip" onClick={onCerrar}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
