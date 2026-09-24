import { useState, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";
import { useAuth } from "../context/AuthContext";
import Encabezado from "../components/Encabezado";
import { ETIQUETAS_ESTADO_VUELO, ETIQUETAS_MOTIVO_CANCELACION, ETIQUETAS_TIPO_RECURSO } from "../utils/reporteVuelos";

function formatoFechaHora(fechaIso) {
  return new Date(fechaIso).toLocaleString("es-GT", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function valorOTexto(valor) {
  return valor === null || valor === undefined || valor === "" ? "—" : valor;
}

function booleanOTexto(valor) {
  if (valor === null || valor === undefined) return "—";
  return valor ? "Sí" : "No";
}

// Filas del reporte, ya con las mismas etiquetas/formato usadas tanto en la
// tabla como en el export a Excel — se centraliza acá para que ambos nunca
// puedan quedar desincronizados.
function filasParaMostrar(vuelos) {
  return vuelos.map((v) => ({
    "Fecha y hora": formatoFechaHora(v.fechaHora),
    "Duración (min)": v.duracionMinutos,
    Estado: ETIQUETAS_ESTADO_VUELO[v.estado] || v.estado,
    Alumno: valorOTexto(v.alumno?.nombre),
    Instructor: valorOTexto(v.instructor?.nombre),
    Recurso: valorOTexto(v.recurso?.matricula),
    "Tipo de recurso": valorOTexto(ETIQUETAS_TIPO_RECURSO[v.recurso?.tipoRecurso]),
    Programa: valorOTexto(v.programa),
    Lección: valorOTexto(v.leccionProgramada),
    "Motivo de cancelación": valorOTexto(ETIQUETAS_MOTIVO_CANCELACION[v.motivoCancelacion]),
    "Cancelado por": valorOTexto(v.canceladoPor?.nombre),
    "Horómetro inicial (sistema)": valorOTexto(v.horometroInicialSistema),
    "Horómetro inicial (instructor)": valorOTexto(v.horometroInicialInstructor),
    "Horómetro final (instructor)": valorOTexto(v.horometroFinalInstructor),
    "Horómetro inicial (alumno)": valorOTexto(v.horometroInicialAlumno),
    "Horómetro final (alumno)": valorOTexto(v.horometroFinalAlumno),
    "Horas de sesión": valorOTexto(v.horasSesionReportadas),
    "Coincidencia horómetro inicial": booleanOTexto(v.coincidenciaHorometroInicial),
    "Coherencia horómetro final": booleanOTexto(v.coherenciaHorometroFinal),
    "Validado por": valorOTexto(v.validadoPor?.nombre),
    "Fecha de validación": v.fechaValidacion ? formatoFechaHora(v.fechaValidacion) : "—",
  }));
}

function exportarExcel(vuelos, desde, hasta) {
  const hoja = XLSX.utils.json_to_sheet(filasParaMostrar(vuelos));
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, "Reporte de vuelos");

  const rango = desde || hasta ? `_${desde || "inicio"}_a_${hasta || "hoy"}` : "_historial_completo";
  XLSX.writeFile(libro, `reporte_vuelos${rango}.xlsx`);
}

export default function ReportesVuelos() {
  const { listarUsuariosPorRol, listarRecursos, listarReporteVuelos } = useAuth();

  const [alumnos, setAlumnos] = useState([]);
  const [recursos, setRecursos] = useState([]);
  const [cargandoFiltros, setCargandoFiltros] = useState(true);

  const [tipo, setTipo] = useState("");
  const [alumnoId, setAlumnoId] = useState("");
  const [recursoId, setRecursoId] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([listarUsuariosPorRol("alumno"), listarRecursos()])
      .then(([datosAlumnos, datosRecursos]) => {
        setAlumnos(datosAlumnos.usuarios);
        setRecursos(datosRecursos.recursos);
      })
      .catch(() => setError("No se pudieron cargar los alumnos/recursos para los filtros."))
      .finally(() => setCargandoFiltros(false));
  }, [listarUsuariosPorRol, listarRecursos]);

  function manejarCambioTipo(nuevoTipo) {
    setTipo(nuevoTipo);
    setAlumnoId("");
    setRecursoId("");
  }

  const generarReporte = useCallback(
    async (e) => {
      e.preventDefault();
      setError("");

      if (tipo === "alumno" && !alumnoId) {
        setError("Selecciona un alumno.");
        return;
      }
      if (tipo === "aeronave" && !recursoId) {
        setError("Selecciona una aeronave o simulador.");
        return;
      }

      setCargando(true);
      try {
        const filtros = {};
        if (tipo) filtros.tipo = tipo;
        if (tipo === "alumno") filtros.alumnoId = alumnoId;
        if (tipo === "aeronave") filtros.recursoId = recursoId;
        if (desde) filtros.desde = desde;
        if (hasta) {
          const fin = new Date(hasta);
          fin.setHours(23, 59, 59, 999);
          filtros.hasta = fin.toISOString();
        }

        const respuesta = await listarReporteVuelos(filtros);
        setDatos({ vuelos: respuesta.vuelos, resumen: respuesta.resumen });
      } catch (err) {
        setError(err.response?.data?.mensaje || "No se pudo generar el reporte.");
        setDatos(null);
      } finally {
        setCargando(false);
      }
    },
    [tipo, alumnoId, recursoId, desde, hasta, listarReporteVuelos]
  );

  return (
    <>
      <Encabezado subtitulo="Reportes de vuelos" />
      <div className="pagina">
        <div className="contenedor-ancho">
          <h1>Reportes de vuelos</h1>
          <p className="subtitulo">Historial de vuelos, con horas acumuladas por alumno o por aeronave.</p>

          <form className="reporte-filtros" onSubmit={generarReporte}>
            <div className="reporte-filtros__campo">
              <label htmlFor="tipoReporte">Tipo</label>
              <select id="tipoReporte" value={tipo} onChange={(e) => manejarCambioTipo(e.target.value)}>
                <option value="">Todos los vuelos</option>
                <option value="alumno">Por alumno</option>
                <option value="aeronave">Por aeronave</option>
              </select>
            </div>

            {tipo === "alumno" && (
              <div className="reporte-filtros__campo">
                <label htmlFor="alumnoReporte">Alumno</label>
                <select
                  id="alumnoReporte"
                  value={alumnoId}
                  onChange={(e) => setAlumnoId(e.target.value)}
                  disabled={cargandoFiltros}
                >
                  <option value="">Selecciona un alumno</option>
                  {alumnos.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {tipo === "aeronave" && (
              <div className="reporte-filtros__campo">
                <label htmlFor="recursoReporte">Aeronave / simulador</label>
                <select
                  id="recursoReporte"
                  value={recursoId}
                  onChange={(e) => setRecursoId(e.target.value)}
                  disabled={cargandoFiltros}
                >
                  <option value="">Selecciona un recurso</option>
                  {recursos.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.matricula}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="reporte-filtros__campo">
              <label htmlFor="desdeReporte">Desde</label>
              <input id="desdeReporte" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
            </div>

            <div className="reporte-filtros__campo">
              <label htmlFor="hastaReporte">Hasta</label>
              <input id="hastaReporte" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
            </div>

            <button type="submit" className="btn-chip" disabled={cargando}>
              {cargando ? "Generando..." : "Generar reporte"}
            </button>
          </form>

          {error && <p className="mensaje-error">{error}</p>}

          {datos && (
            <>
              <div className="reporte-resumen">
                <div className="reporte-resumen__tarjeta">
                  <span className="reporte-resumen__numero">{datos.resumen.totalVuelos}</span>
                  <span className="reporte-resumen__etiqueta">Total de vuelos</span>
                </div>
                <div className="reporte-resumen__tarjeta">
                  <span className="reporte-resumen__numero">{datos.resumen.totalFinalizados}</span>
                  <span className="reporte-resumen__etiqueta">Finalizados</span>
                </div>
                <div className="reporte-resumen__tarjeta">
                  <span className="reporte-resumen__numero">{datos.resumen.totalCancelados}</span>
                  <span className="reporte-resumen__etiqueta">Cancelados</span>
                </div>
                <div className="reporte-resumen__tarjeta">
                  <span className="reporte-resumen__numero">{datos.resumen.totalOtrosEstados}</span>
                  <span className="reporte-resumen__etiqueta">En proceso / confirmados / en curso</span>
                </div>
                <div className="reporte-resumen__tarjeta">
                  <span className="reporte-resumen__numero">{datos.resumen.totalHoras}</span>
                  <span className="reporte-resumen__etiqueta">Horas totales</span>
                </div>
                <div className="reporte-resumen__tarjeta">
                  <span className="reporte-resumen__numero">{datos.resumen.totalHorasAvion}</span>
                  <span className="reporte-resumen__etiqueta">Horas avión</span>
                </div>
                <div className="reporte-resumen__tarjeta">
                  <span className="reporte-resumen__numero">{datos.resumen.totalHorasSimulador}</span>
                  <span className="reporte-resumen__etiqueta">Horas simulador</span>
                </div>
              </div>
              <p className="subtitulo">
                Las horas totales solo consideran vuelos <strong>finalizados</strong> con horómetro validado — por
                eso no van a sumar contra el total de vuelos si hay cancelados u otros estados en el rango.
              </p>

              {datos.vuelos.length > 0 && (
                <button type="button" className="btn-chip btn-chip--secundario" onClick={() => exportarExcel(datos.vuelos, desde, hasta)}>
                  Exportar a Excel
                </button>
              )}

              {datos.vuelos.length === 0 ? (
                <p className="subtitulo">No hay vuelos que coincidan con estos filtros.</p>
              ) : (
                <div className="reporte-tabla-contenedor">
                  <table className="reporte-tabla">
                    <thead>
                      <tr>
                        <th>Fecha y hora</th>
                        <th>Duración (min)</th>
                        <th>Estado</th>
                        <th>Alumno</th>
                        <th>Instructor</th>
                        <th>Recurso</th>
                        <th>Tipo de recurso</th>
                        <th>Programa</th>
                        <th>Lección</th>
                        <th>Motivo de cancelación</th>
                        <th>Cancelado por</th>
                        <th>Horómetro inicial (sistema)</th>
                        <th>Horómetro inicial (instructor)</th>
                        <th>Horómetro final (instructor)</th>
                        <th>Horómetro inicial (alumno)</th>
                        <th>Horómetro final (alumno)</th>
                        <th>Horas de sesión</th>
                        <th>Coincidencia horómetro inicial</th>
                        <th>Coherencia horómetro final</th>
                        <th>Validado por</th>
                        <th>Fecha de validación</th>
                      </tr>
                    </thead>
                    <tbody>
                      {datos.vuelos.map((v) => (
                        <tr key={v.id}>
                          <td>{formatoFechaHora(v.fechaHora)}</td>
                          <td>{v.duracionMinutos}</td>
                          <td>
                            <span className={`estado-badge estado-badge--${v.estado}`}>
                              {ETIQUETAS_ESTADO_VUELO[v.estado] || v.estado}
                            </span>
                          </td>
                          <td>{valorOTexto(v.alumno?.nombre)}</td>
                          <td>{valorOTexto(v.instructor?.nombre)}</td>
                          <td>{valorOTexto(v.recurso?.matricula)}</td>
                          <td>{valorOTexto(ETIQUETAS_TIPO_RECURSO[v.recurso?.tipoRecurso])}</td>
                          <td>{valorOTexto(v.programa)}</td>
                          <td>{valorOTexto(v.leccionProgramada)}</td>
                          <td>{valorOTexto(ETIQUETAS_MOTIVO_CANCELACION[v.motivoCancelacion])}</td>
                          <td>{valorOTexto(v.canceladoPor?.nombre)}</td>
                          <td>{valorOTexto(v.horometroInicialSistema)}</td>
                          <td>{valorOTexto(v.horometroInicialInstructor)}</td>
                          <td>{valorOTexto(v.horometroFinalInstructor)}</td>
                          <td>{valorOTexto(v.horometroInicialAlumno)}</td>
                          <td>{valorOTexto(v.horometroFinalAlumno)}</td>
                          <td>{valorOTexto(v.horasSesionReportadas)}</td>
                          <td>{booleanOTexto(v.coincidenciaHorometroInicial)}</td>
                          <td>{booleanOTexto(v.coherenciaHorometroFinal)}</td>
                          <td>{valorOTexto(v.validadoPor?.nombre)}</td>
                          <td>{v.fechaValidacion ? formatoFechaHora(v.fechaValidacion) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
