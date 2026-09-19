import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";

const ETIQUETAS_PROGRAMA = {
  piloto_privado: "Piloto privado",
  ifr: "IFR",
  bimotor: "Bimotor",
  comercial: "Comercial",
};

// alumno: { id, nombre } — viene del resultado de la búsqueda por DPI.
export default function ModalInscribirPrograma({ alumno, onCerrar }) {
  const { listarProgramas, listarUsuariosPorRol, listarProgresoDeAlumno, inscribirAlumno, reasignarInstructorProgreso } =
    useAuth();

  const [programas, setProgramas] = useState([]);
  const [instructores, setInstructores] = useState([]);
  const [inscripciones, setInscripciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [programaId, setProgramaId] = useState("");
  const [instructorAsignadoId, setInstructorAsignadoId] = useState("");
  const [enviando, setEnviando] = useState(false);

  const [reasignandoId, setReasignandoId] = useState(null);
  const [nuevoInstructorPorFila, setNuevoInstructorPorFila] = useState({});

  const cargarTodo = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const [datosProgramas, datosInstructores, datosInscripciones] = await Promise.all([
        listarProgramas(),
        listarUsuariosPorRol("instructor"),
        listarProgresoDeAlumno(alumno.id),
      ]);
      setProgramas(datosProgramas.programas);
      setInstructores(datosInstructores.usuarios);
      setInscripciones(datosInscripciones.progresos);
    } catch (err) {
      setError(err.response?.data?.mensaje || "No se pudieron cargar los datos.");
    } finally {
      setCargando(false);
    }
  }, [alumno.id, listarProgramas, listarUsuariosPorRol, listarProgresoDeAlumno]);

  useEffect(() => {
    cargarTodo();
  }, [cargarTodo]);

  // El backend ya rechaza (409) una segunda inscripción activa en el mismo
  // programa; esto solo evita ofrecerlo de entrada en el selector.
  const programasDisponibles = programas.filter((p) => !inscripciones.some((i) => i.programaId === p.id));

  async function manejarInscribir(e) {
    e.preventDefault();
    setError("");
    setMensaje("");

    if (!programaId) {
      setError("Selecciona un programa.");
      return;
    }

    setEnviando(true);
    try {
      const datos = await inscribirAlumno({
        alumnoId: alumno.id,
        programaId: Number(programaId),
        instructorAsignadoId: instructorAsignadoId ? Number(instructorAsignadoId) : undefined,
      });
      setMensaje(datos.mensaje);
      setProgramaId("");
      setInstructorAsignadoId("");
      await cargarTodo();
    } catch (err) {
      setError(err.response?.data?.mensaje || "No se pudo inscribir al alumno.");
    } finally {
      setEnviando(false);
    }
  }

  async function manejarReasignar(progresoId) {
    const nuevoId = nuevoInstructorPorFila[progresoId];
    if (!nuevoId) {
      setError("Selecciona un instructor para reasignar.");
      return;
    }

    setError("");
    setMensaje("");
    setReasignandoId(progresoId);
    try {
      const datos = await reasignarInstructorProgreso(progresoId, Number(nuevoId));
      setMensaje(datos.mensaje);
      await cargarTodo();
    } catch (err) {
      setError(err.response?.data?.mensaje || "No se pudo reasignar el instructor.");
    } finally {
      setReasignandoId(null);
    }
  }

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <div className="modal-caja" onClick={(e) => e.stopPropagation()}>
        <h2>Inscripciones de {alumno.nombre}</h2>
        <p className="subtitulo">Programas activos y nueva inscripción a un programa.</p>

        {cargando ? (
          <p className="subtitulo">Cargando...</p>
        ) : (
          <>
            {inscripciones.length > 0 && (
              <div className="detalle-vuelo__seccion">
                <h3>Inscripciones activas</h3>
                <div className="detalle-vuelo">
                  {inscripciones.map((i) => (
                    <div key={i.id} className="detalle-vuelo__fila">
                      <span className="detalle-vuelo__etiqueta">
                        {ETIQUETAS_PROGRAMA[i.Programa?.nombre] || i.Programa?.nombre}
                      </span>
                      <span>
                        Lección actual: {i.leccionActual} · Instructor: {i.instructorAsignado?.nombre || "Sin asignar"}
                      </span>
                      <div className="accion-inline">
                        <select
                          value={nuevoInstructorPorFila[i.id] || ""}
                          onChange={(e) =>
                            setNuevoInstructorPorFila((prev) => ({ ...prev, [i.id]: e.target.value }))
                          }
                          disabled={reasignandoId === i.id}
                        >
                          <option value="">Reasignar instructor...</option>
                          {instructores.map((ins) => (
                            <option key={ins.id} value={ins.id}>
                              {ins.nombre}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="btn-chip"
                          disabled={reasignandoId === i.id}
                          onClick={() => manejarReasignar(i.id)}
                        >
                          {reasignandoId === i.id ? "Guardando..." : "Guardar"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="detalle-vuelo__seccion">
              <h3>Inscribir a un nuevo programa</h3>
              {programasDisponibles.length === 0 ? (
                <p className="subtitulo">Ya está inscrito en todos los programas disponibles.</p>
              ) : (
                <form onSubmit={manejarInscribir} className="formulario-auth">
                  <label htmlFor="programa">Programa</label>
                  <select id="programa" value={programaId} onChange={(e) => setProgramaId(e.target.value)} required>
                    <option value="">Selecciona un programa</option>
                    {programasDisponibles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {ETIQUETAS_PROGRAMA[p.nombre] || p.nombre}
                      </option>
                    ))}
                  </select>

                  <label htmlFor="instructorAsignado">Instructor asignado (opcional)</label>
                  <select
                    id="instructorAsignado"
                    value={instructorAsignadoId}
                    onChange={(e) => setInstructorAsignadoId(e.target.value)}
                  >
                    <option value="">Sin asignar por ahora</option>
                    {instructores.map((ins) => (
                      <option key={ins.id} value={ins.id}>
                        {ins.nombre}
                      </option>
                    ))}
                  </select>

                  <button type="submit" disabled={enviando}>
                    {enviando ? "Inscribiendo..." : "Inscribir"}
                  </button>
                </form>
              )}
            </div>
          </>
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
