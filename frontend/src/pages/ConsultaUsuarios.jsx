import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import Encabezado from "../components/Encabezado";
import ModalInscribirPrograma from "../components/ModalInscribirPrograma";
import BarraProgreso from "../components/BarraProgreso";
import IndicadorCumplimiento from "../components/IndicadorCumplimiento";

const PESTANAS = [
  { valor: "usuarios", etiqueta: "Todos los usuarios" },
  { valor: "progreso", etiqueta: "Progreso de alumnos" },
];

const ETIQUETAS_PROGRAMA = {
  piloto_privado: "Piloto privado",
  ifr: "IFR",
  bimotor: "Bimotor",
  comercial: "Comercial",
};

export default function ConsultaUsuarios() {
  const { buscarUsuarioPorDpi, listarProgresoActivo } = useAuth();

  const [pestana, setPestana] = useState("usuarios");
  const [dpi, setDpi] = useState("");

  // ---------- Pestaña "Todos los usuarios" (comportamiento idéntico al
  // que ya tenía esta pantalla) ----------
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [mostrarInscripcion, setMostrarInscripcion] = useState(false);

  async function manejarBuscarUsuario() {
    setError("");
    setResultado(null);

    if (!/^\d{13}$/.test(dpi)) {
      setError("El DPI debe tener exactamente 13 dígitos numéricos.");
      return;
    }

    setCargando(true);
    try {
      const datos = await buscarUsuarioPorDpi(dpi);
      setResultado(datos.usuario);
    } catch (err) {
      setError(err.response?.data?.mensaje || "No se pudo realizar la búsqueda.");
    } finally {
      setCargando(false);
    }
  }

  // ---------- Pestaña "Progreso de alumnos" ----------
  const [progresos, setProgresos] = useState([]);
  const [cargandoProgreso, setCargandoProgreso] = useState(false);
  const [errorProgreso, setErrorProgreso] = useState("");
  const [cargadoProgreso, setCargadoProgreso] = useState(false);

  const cargarProgresos = useCallback(async () => {
    setCargandoProgreso(true);
    setErrorProgreso("");
    try {
      const datos = await listarProgresoActivo();
      setProgresos(datos.progresos);
    } catch (err) {
      setErrorProgreso(err.response?.data?.mensaje || "No se pudo cargar el progreso de los alumnos.");
    } finally {
      setCargandoProgreso(false);
      setCargadoProgreso(true);
    }
  }, [listarProgresoActivo]);

  useEffect(() => {
    if (pestana === "progreso" && !cargadoProgreso) {
      cargarProgresos();
    }
  }, [pestana, cargadoProgreso, cargarProgresos]);

  const progresosFiltrados = dpi ? progresos.filter((p) => p.alumno?.dpi?.includes(dpi)) : progresos;

  function manejarEnvioFormulario(e) {
    e.preventDefault();
    if (pestana === "usuarios") manejarBuscarUsuario();
  }

  return (
    <>
      <Encabezado subtitulo="Consulta de usuarios" />
      <div className="pagina">
        <div className="contenedor-ancho">
          <h1>Consulta de usuarios</h1>

          <div className="pestanas">
            {PESTANAS.map((p) => (
              <button
                key={p.valor}
                type="button"
                className={`pestana ${pestana === p.valor ? "pestana--activa" : ""}`}
                onClick={() => setPestana(p.valor)}
              >
                {p.etiqueta}
              </button>
            ))}
          </div>

          <form className="reporte-filtros" onSubmit={manejarEnvioFormulario}>
            <div className="reporte-filtros__campo reporte-filtros__campo--dpi">
              <label htmlFor="dpiConsulta">Número de DPI</label>
              <input
                id="dpiConsulta"
                type="text"
                inputMode="numeric"
                maxLength={13}
                value={dpi}
                onChange={(e) => setDpi(e.target.value.replace(/\D/g, ""))}
                placeholder="13 dígitos, sin espacios ni guiones"
              />
            </div>
            {pestana === "usuarios" && (
              <button type="submit" className="btn-chip" disabled={cargando}>
                {cargando ? "Buscando..." : "Buscar"}
              </button>
            )}
          </form>

          {pestana === "usuarios" ? (
            <>
              {error && <p className="mensaje-error">{error}</p>}

              {resultado && (
                <p className="mensaje-exito">
                  <strong>{resultado.nombre}</strong>
                  <br />
                  {resultado.correo}
                </p>
              )}

              {resultado && resultado.rol === "alumno" && (
                <div className="tarjeta-recurso__acciones-admin">
                  <button
                    type="button"
                    className="btn-chip btn-chip--secundario"
                    onClick={() => setMostrarInscripcion(true)}
                  >
                    Inscribir a programa
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              {errorProgreso && <p className="mensaje-error">{errorProgreso}</p>}

              {cargandoProgreso ? (
                <p className="subtitulo">Cargando progreso de alumnos...</p>
              ) : progresosFiltrados.length === 0 ? (
                <p className="subtitulo">No hay inscripciones activas que coincidan.</p>
              ) : (
                <div className="reporte-tabla-contenedor">
                  <table className="reporte-tabla reporte-tabla--compacta">
                    <thead>
                      <tr>
                        <th>Alumno</th>
                        <th>Programa</th>
                        <th>Horas simulador</th>
                        <th>Horas avión</th>
                        <th>Progreso</th>
                        <th>Cumplimiento RAC-141</th>
                      </tr>
                    </thead>
                    <tbody>
                      {progresosFiltrados.map((p) => (
                        <tr key={p.id}>
                          <td>{p.alumno?.nombre || "—"}</td>
                          <td>{ETIQUETAS_PROGRAMA[p.Programa?.nombre] || p.Programa?.nombre || "—"}</td>
                          <td>
                            {Number(p.horasSimuladorAcumuladas)} / {Number(p.Programa?.horasSimuladorTotal ?? 0)}
                          </td>
                          <td>
                            {Number(p.horasAvionAcumuladas)} / {Number(p.Programa?.horasAvionTotal ?? 0)}
                          </td>
                          <td style={{ minWidth: "130px" }}>
                            <BarraProgreso porcentaje={p.cumplimiento?.pctTotal ?? 0} />
                          </td>
                          <td style={{ minWidth: "160px" }}>
                            <IndicadorCumplimiento cumplimiento={p.cumplimiento} compacto />
                          </td>
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

      {mostrarInscripcion && resultado && (
        <ModalInscribirPrograma alumno={resultado} onCerrar={() => setMostrarInscripcion(false)} />
      )}
    </>
  );
}
