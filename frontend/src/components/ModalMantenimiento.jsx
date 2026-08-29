import { useState } from "react";
import { useAuth } from "../context/AuthContext";

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

// modo: "registrar" | "finalizar"
export default function ModalMantenimiento({ modo, recurso, mantenimiento, onCerrar, onExito }) {
  const { registrarMantenimiento, finalizarMantenimiento } = useAuth();

  const [tipoMantenimiento, setTipoMantenimiento] = useState("preventivo");
  const [fecha, setFecha] = useState(hoyISO());
  const [horas, setHoras] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const esRegistrar = modo === "registrar";

  async function manejarEnvio(e) {
    e.preventDefault();
    setError("");
    setCargando(true);

    try {
      let datos;
      if (esRegistrar) {
        datos = await registrarMantenimiento(recurso.id, {
          tipoMantenimiento,
          fechaInicio: fecha,
          horasAlIngreso: horas ? Number(horas) : null,
          descripcion: descripcion || null,
        });
      } else {
        datos = await finalizarMantenimiento(mantenimiento.id, {
          fechaFin: fecha,
          horasActuales: horas ? Number(horas) : null,
        });
      }
      onExito(datos.mensaje);
    } catch (err) {
      setError(err.response?.data?.mensaje || "No se pudo completar la operación.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <div className="modal-caja" onClick={(e) => e.stopPropagation()}>
        <h2>{esRegistrar ? "Registrar mantenimiento" : "Finalizar mantenimiento"}</h2>
        <p className="subtitulo">
          {recurso.matricula} — {recurso.modelo || "Sin modelo"}
        </p>

        <form onSubmit={manejarEnvio} className="formulario-auth">
          {esRegistrar && (
            <>
              <label htmlFor="tipoMantenimiento">Tipo de mantenimiento</label>
              <select
                id="tipoMantenimiento"
                value={tipoMantenimiento}
                onChange={(e) => setTipoMantenimiento(e.target.value)}
              >
                <option value="preventivo">Preventivo</option>
                <option value="correctivo">Correctivo</option>
              </select>
            </>
          )}

          <label htmlFor="fecha">{esRegistrar ? "Fecha de inicio" : "Fecha de finalización"}</label>
          <input id="fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />

          <label htmlFor="horas">{esRegistrar ? "Horas al ingreso (opcional)" : "Horas actuales (opcional)"}</label>
          <input
            id="horas"
            type="number"
            min="0"
            step="0.1"
            value={horas}
            onChange={(e) => setHoras(e.target.value)}
          />

          {esRegistrar && (
            <>
              <label htmlFor="descripcion">Descripción</label>
              <textarea
                id="descripcion"
                rows={3}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
              />
            </>
          )}

          {error && <p className="mensaje-error">{error}</p>}

          <div className="modal-caja__acciones">
            <button type="button" className="btn-chip btn-chip--secundario" onClick={onCerrar} disabled={cargando}>
              Cancelar
            </button>
            <button type="submit" disabled={cargando}>
              {cargando ? "Enviando..." : esRegistrar ? "Registrar" : "Finalizar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
