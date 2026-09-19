import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../context/AuthContext";

const PESTANAS_RECURSO = [
  { valor: "aeronaves", etiqueta: "Aeronaves" },
  { valor: "simuladores", etiqueta: "Simuladores" },
];

const DURACION_FIJA_MINUTOS = 120;

function calcularHoraFin(horaInicio) {
  const [h, m] = horaInicio.split(":").map(Number);
  const finHoras = h + Math.floor((DURACION_FIJA_MINUTOS + m) / 60);
  const finMinutos = (m + DURACION_FIJA_MINUTOS) % 60;
  return `${String(finHoras).padStart(2, "0")}:${String(finMinutos).padStart(2, "0")}`;
}

function formatoFechaLarga(fecha) {
  const texto = fecha.toLocaleDateString("es-GT", { weekday: "long", day: "numeric", month: "long" });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function construirFechaHora(fecha, horaInicio) {
  const [h, m] = horaInicio.split(":").map(Number);
  const resultado = new Date(fecha);
  resultado.setHours(h, m, 0, 0);
  return resultado;
}

// precarga: { fecha: Date, horaInicio: "HH:MM", recursoId, tipoRecurso }
// Siempre viene de un clic sobre un bloque vacío del calendario (ver
// CalendarioSemanal) — este panel ya no tiene otra forma de abrirse, así
// que fecha y hora nunca se escriben a mano, solo se muestran.
export default function ModalFormularioVuelo({ precarga, onCerrar, onExito }) {
  const { usuario, listarRecursos, listarUsuariosPorRol, listarPrioridadAlumnos, crearVuelo } = useAuth();

  const esInstructor = usuario?.rol === "instructor";
  const esAlumno = usuario?.rol === "alumno";
  const esAdmin = usuario?.rol === "administrador";

  const [recursos, setRecursos] = useState([]);
  const [pestanaRecurso, setPestanaRecurso] = useState(precarga.tipoRecurso || "aeronaves");
  const [instructores, setInstructores] = useState([]);
  const [alumnos, setAlumnos] = useState([]);
  const [prioridades, setPrioridades] = useState([]);

  const [recursoId, setRecursoId] = useState(precarga.recursoId ? String(precarga.recursoId) : "");
  const [instructorId, setInstructorId] = useState("");
  const [alumnoId, setAlumnoId] = useState("");
  const [leccionProgramada, setLeccionProgramada] = useState("");

  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  const cargarListas = useCallback(async () => {
    setCargandoDatos(true);
    setError("");
    try {
      const necesitaInstructores = !esInstructor;
      const necesitaAlumnos = !esAlumno;

      const promesas = [listarRecursos()];
      if (necesitaInstructores) promesas.push(listarUsuariosPorRol("instructor"));
      if (necesitaAlumnos) promesas.push(listarUsuariosPorRol("alumno"));
      if (esAdmin) promesas.push(listarPrioridadAlumnos());

      const resultados = await Promise.all(promesas);
      let indice = 0;
      setRecursos(resultados[indice++].recursos);
      if (necesitaInstructores) setInstructores(resultados[indice++].usuarios);
      if (necesitaAlumnos) setAlumnos(resultados[indice++].usuarios);
      if (esAdmin) setPrioridades(resultados[indice++].alumnos);
    } catch (err) {
      setError(err.response?.data?.mensaje || "No se pudieron cargar los datos del formulario.");
    } finally {
      setCargandoDatos(false);
    }
  }, [esAdmin, esInstructor, esAlumno, listarRecursos, listarUsuariosPorRol, listarPrioridadAlumnos]);

  useEffect(() => {
    cargarListas();
  }, [cargarListas]);

  const recursosFiltrados = recursos.filter((r) =>
    pestanaRecurso === "aeronaves" ? r.tipoRecurso !== "simulador" : r.tipoRecurso === "simulador"
  );

  const prioridadAlumnoSeleccionado = useMemo(() => {
    if (!esAdmin || !alumnoId) return null;
    return (
      prioridades.find(
        (p) => Number(p.alumnoId) === Number(alumnoId) && p.programaNombre === "piloto_privado"
      ) || null
    );
  }, [esAdmin, alumnoId, prioridades]);

  const mostrarLeccionProgramada =
    !esAdmin || (prioridadAlumnoSeleccionado && prioridadAlumnoSeleccionado.programaNombre === "piloto_privado");

  async function manejarEnvio(e) {
    e.preventDefault();
    setError("");

    const instructorFinal = esInstructor ? usuario.id : instructorId;
    const alumnoFinal = esAlumno ? usuario.id : alumnoId;

    if (!recursoId || !instructorFinal || !alumnoFinal) {
      setError("Recurso, instructor y alumno son obligatorios.");
      return;
    }

    const fechaHora = construirFechaHora(precarga.fecha, precarga.horaInicio);

    setEnviando(true);
    try {
      const datos = await crearVuelo({
        recursoId: Number(recursoId),
        instructorId: Number(instructorFinal),
        alumnoId: Number(alumnoFinal),
        fechaHora: fechaHora.toISOString(),
        duracionMinutos: DURACION_FIJA_MINUTOS,
        leccionProgramada: leccionProgramada === "" ? null : Number(leccionProgramada),
      });
      onExito(datos.mensaje);
    } catch (err) {
      setError(err.response?.data?.mensaje || "No se pudo programar el vuelo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <div className="modal-caja" onClick={(e) => e.stopPropagation()}>
        <h2>Programar vuelo</h2>
        <p className="subtitulo">Completa los datos para agendar el vuelo.</p>

        {cargandoDatos ? (
          <p className="subtitulo">Cargando formulario...</p>
        ) : (
          <form onSubmit={manejarEnvio} className="formulario-auth">
            <label>Tipo de recurso</label>
            <div className="pestanas">
              {PESTANAS_RECURSO.map((p) => (
                <button
                  key={p.valor}
                  type="button"
                  className={`pestana ${pestanaRecurso === p.valor ? "pestana--activa" : ""}`}
                  onClick={() => {
                    setPestanaRecurso(p.valor);
                    setRecursoId("");
                  }}
                >
                  {p.etiqueta}
                </button>
              ))}
            </div>

            <label htmlFor="recurso">Recurso</label>
            <select id="recurso" value={recursoId} onChange={(e) => setRecursoId(e.target.value)} required>
              <option value="">Selecciona un recurso</option>
              {recursosFiltrados.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.matricula}
                  {r.modelo ? ` — ${r.modelo}` : ""}
                </option>
              ))}
            </select>

            {esInstructor ? (
              <>
                <label>Instructor</label>
                <p className="formulario-vuelo__fijo">{usuario.nombre} (tú)</p>
              </>
            ) : (
              <>
                <label htmlFor="instructor">Instructor</label>
                <select
                  id="instructor"
                  value={instructorId}
                  onChange={(e) => setInstructorId(e.target.value)}
                  required
                >
                  <option value="">Selecciona un instructor</option>
                  {instructores.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.nombre}
                    </option>
                  ))}
                </select>
              </>
            )}

            {esAlumno ? (
              <>
                <label>Alumno</label>
                <p className="formulario-vuelo__fijo">{usuario.nombre} (tú)</p>
              </>
            ) : (
              <>
                <label htmlFor="alumno">Alumno</label>
                <select id="alumno" value={alumnoId} onChange={(e) => setAlumnoId(e.target.value)} required>
                  <option value="">Selecciona un alumno</option>
                  {alumnos.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nombre}
                    </option>
                  ))}
                </select>
                {prioridadAlumnoSeleccionado && (
                  <p className="formulario-vuelo__ayuda">
                    Prioridad: <strong>{prioridadAlumnoSeleccionado.prioridadCalculada}</strong> · Lección
                    actual: <strong>{prioridadAlumnoSeleccionado.leccionActual}</strong> (
                    {prioridadAlumnoSeleccionado.programaNombre})
                  </p>
                )}
              </>
            )}

            <label>Fecha y hora</label>
            <p className="formulario-vuelo__fijo">
              {formatoFechaLarga(precarga.fecha)}, {precarga.horaInicio} - {calcularHoraFin(precarga.horaInicio)}
            </p>

            <label>Duración</label>
            <p className="formulario-vuelo__fijo">2 horas (bloque fijo de agendado)</p>

            {mostrarLeccionProgramada && (
              <>
                <label htmlFor="leccion">Lección programada (opcional)</label>
                <input
                  id="leccion"
                  type="number"
                  min="1"
                  step="1"
                  value={leccionProgramada}
                  onChange={(e) => setLeccionProgramada(e.target.value)}
                />
              </>
            )}

            {error && <p className="mensaje-error">{error}</p>}

            <div className="modal-caja__acciones">
              <button type="button" className="btn-chip btn-chip--secundario" onClick={onCerrar} disabled={enviando}>
                Cancelar
              </button>
              <button type="submit" disabled={enviando}>
                {enviando ? "Programando..." : "Programar vuelo"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
