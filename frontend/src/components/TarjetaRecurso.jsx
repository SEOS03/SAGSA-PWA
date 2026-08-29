import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ETIQUETAS_ESTADO = {
  disponible: "Disponible",
  en_vuelo: "En vuelo",
  proximo_a_mantenimiento: "Próximo a mantenimiento",
  en_mantenimiento: "En mantenimiento",
  fuera_de_servicio: "Fuera de servicio",
};

const OPCIONES_ESTADO = Object.keys(ETIQUETAS_ESTADO);

export default function TarjetaRecurso({ recurso, onCambio, onAbrirMantenimiento, onAbrirFinalizar, onDarDeBaja }) {
  const { usuario, cambiarEstadoRecurso, actualizarHorasRecurso } = useAuth();

  const [nuevoEstado, setNuevoEstado] = useState(recurso.estado);
  const [nuevasHoras, setNuevasHoras] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const puedeAccionar = usuario?.rol === "administrador";
  const esSuperAdmin = !!usuario?.esSuperAdmin;

  async function manejarCambioEstado() {
    setError("");
    setMensaje("");
    if (nuevoEstado === recurso.estado) return;
    setCargando(true);
    try {
      const datos = await cambiarEstadoRecurso(recurso.id, nuevoEstado);
      setMensaje(datos.mensaje);
      onCambio();
    } catch (err) {
      setError(err.response?.data?.mensaje || "No se pudo cambiar el estado.");
    } finally {
      setCargando(false);
    }
  }

  async function manejarActualizarHoras() {
    setError("");
    setMensaje("");
    if (!nuevasHoras) return;
    setCargando(true);
    try {
      const datos = await actualizarHorasRecurso(recurso.id, Number(nuevasHoras));
      setMensaje(datos.mensaje);
      setNuevasHoras("");
      onCambio();
    } catch (err) {
      setError(err.response?.data?.mensaje || "No se pudieron actualizar las horas.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="tarjeta-recurso">
      <div className="tarjeta-recurso__cabecera">
        <span className="tarjeta-recurso__matricula">{recurso.matricula}</span>
        <span className={`estado-badge estado-badge--${recurso.estado}`}>
          {ETIQUETAS_ESTADO[recurso.estado] || recurso.estado}
        </span>
      </div>

      <p className="tarjeta-recurso__modelo">{recurso.modelo || "Sin modelo registrado"}</p>
      <p className="tarjeta-recurso__horas">
        Horas acumuladas: <strong>{Number(recurso.horasAcumuladas).toFixed(2)}</strong>
      </p>

      {puedeAccionar && (
        <div className="tarjeta-recurso__acciones">
          <div className="accion-inline">
            <select value={nuevoEstado} onChange={(e) => setNuevoEstado(e.target.value)} disabled={cargando}>
              {OPCIONES_ESTADO.map((opcion) => (
                <option key={opcion} value={opcion}>
                  {ETIQUETAS_ESTADO[opcion]}
                </option>
              ))}
            </select>
            <button type="button" className="btn-chip" onClick={manejarCambioEstado} disabled={cargando}>
              Cambiar estado
            </button>
          </div>

          <div className="accion-inline">
            <input
              type="number"
              min="0"
              step="0.1"
              placeholder="Nuevas horas"
              value={nuevasHoras}
              onChange={(e) => setNuevasHoras(e.target.value)}
              disabled={cargando}
            />
            <button type="button" className="btn-chip" onClick={manejarActualizarHoras} disabled={cargando}>
              Actualizar horas
            </button>
          </div>

          {recurso.estado === "en_mantenimiento" ? (
            <button type="button" className="btn-chip" onClick={() => onAbrirFinalizar(recurso)}>
              Finalizar mantenimiento
            </button>
          ) : (
            <button type="button" className="btn-chip" onClick={() => onAbrirMantenimiento(recurso)}>
              Registrar mantenimiento
            </button>
          )}
        </div>
      )}

      {esSuperAdmin && (
        <div className="tarjeta-recurso__acciones-admin">
          <Link className="btn-chip btn-chip--secundario" to={`/panel/recursos/${recurso.id}/editar`}>
            Editar
          </Link>
          <button type="button" className="btn-chip btn-chip--peligro" onClick={() => onDarDeBaja(recurso)}>
            Dar de baja
          </button>
        </div>
      )}

      {error && <p className="mensaje-error">{error}</p>}
      {mensaje && <p className="mensaje-exito">{mensaje}</p>}
    </div>
  );
}

export { ETIQUETAS_ESTADO };
