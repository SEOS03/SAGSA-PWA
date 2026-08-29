import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Encabezado from "../components/Encabezado";

const TIPOS_RECURSO = [
  { valor: "ala_fija", etiqueta: "Ala fija" },
  { valor: "ala_rotativa", etiqueta: "Ala rotativa" },
  { valor: "simulador", etiqueta: "Simulador" },
];

export default function RecursoFormulario() {
  const { id } = useParams();
  const esEdicion = !!id;
  const navigate = useNavigate();
  const { obtenerRecurso, crearRecurso, actualizarRecurso } = useAuth();

  const [matricula, setMatricula] = useState("");
  const [modelo, setModelo] = useState("");
  const [tipoRecurso, setTipoRecurso] = useState("ala_fija");
  const [horasParaMantenimiento, setHorasParaMantenimiento] = useState("");
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [cargando, setCargando] = useState(false);
  const [cargandoDatos, setCargandoDatos] = useState(esEdicion);

  useEffect(() => {
    if (!esEdicion) return;
    (async () => {
      try {
        const datos = await obtenerRecurso(id);
        setMatricula(datos.recurso.matricula);
        setModelo(datos.recurso.modelo || "");
        setTipoRecurso(datos.recurso.tipoRecurso);
        setHorasParaMantenimiento(
          datos.recurso.horasParaMantenimiento !== null && datos.recurso.horasParaMantenimiento !== undefined
            ? datos.recurso.horasParaMantenimiento
            : ""
        );
      } catch (err) {
        setError(err.response?.data?.mensaje || "No se pudo cargar el recurso.");
      } finally {
        setCargandoDatos(false);
      }
    })();
  }, [esEdicion, id, obtenerRecurso]);

  async function manejarEnvio(e) {
    e.preventDefault();
    setError("");
    setExito("");
    setCargando(true);

    const datos = {
      matricula,
      modelo: modelo || null,
      tipoRecurso,
      horasParaMantenimiento: horasParaMantenimiento === "" ? null : Number(horasParaMantenimiento),
    };

    try {
      if (esEdicion) {
        const respuesta = await actualizarRecurso(id, datos);
        setExito(respuesta.mensaje);
      } else {
        const respuesta = await crearRecurso(datos);
        setExito(respuesta.mensaje);
        setMatricula("");
        setModelo("");
        setTipoRecurso("ala_fija");
        setHorasParaMantenimiento("");
      }
    } catch (err) {
      setError(err.response?.data?.mensaje || "No se pudo guardar el recurso.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <>
      <Encabezado subtitulo={esEdicion ? "Editar recurso" : "Nuevo recurso"} />
      <div className="pagina">
        <div className="contenedor-auth">
          <h1>{esEdicion ? "Editar recurso" : "Nuevo recurso"}</h1>
          <p className="subtitulo">Aeronaves y simuladores comparten el mismo registro.</p>

          {cargandoDatos ? (
            <p className="subtitulo">Cargando datos del recurso...</p>
          ) : (
            <form onSubmit={manejarEnvio} className="formulario-auth">
              <label htmlFor="matricula">Matrícula</label>
              <input
                id="matricula"
                type="text"
                value={matricula}
                onChange={(e) => setMatricula(e.target.value.toUpperCase())}
                placeholder="Ej. TG-MSA"
                required
              />

              <label htmlFor="modelo">Modelo</label>
              <input id="modelo" type="text" value={modelo} onChange={(e) => setModelo(e.target.value)} />

              <label htmlFor="tipoRecurso">Tipo de recurso</label>
              <select id="tipoRecurso" value={tipoRecurso} onChange={(e) => setTipoRecurso(e.target.value)}>
                {TIPOS_RECURSO.map((opcion) => (
                  <option key={opcion.valor} value={opcion.valor}>
                    {opcion.etiqueta}
                  </option>
                ))}
              </select>

              <label htmlFor="horasParaMantenimiento">Horas para el próximo mantenimiento (opcional)</label>
              <input
                id="horasParaMantenimiento"
                type="number"
                min="0"
                step="0.1"
                value={horasParaMantenimiento}
                onChange={(e) => setHorasParaMantenimiento(e.target.value)}
              />

              {error && <p className="mensaje-error">{error}</p>}
              {exito && <p className="mensaje-exito">{exito}</p>}

              <button type="submit" disabled={cargando}>
                {cargando ? "Guardando..." : esEdicion ? "Guardar cambios" : "Crear recurso"}
              </button>
            </form>
          )}

          <p className="enlace-secundario">
            <Link to="/panel/recursos">Volver a recursos</Link>
          </p>
        </div>
      </div>
    </>
  );
}
