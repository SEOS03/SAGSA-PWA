import { useState } from "react";
import { useAuth } from "../context/AuthContext";

function formatoFechaCorta(fechaIso) {
  return new Date(fechaIso).toLocaleDateString("es-GT", { day: "numeric", month: "short", year: "numeric" });
}

function numero(valor) {
  return valor === null || valor === undefined ? "—" : Number(valor).toFixed(2);
}

// item: { vuelo, registro } — el vuelo trae recurso/instructor/alumno
// incluidos (GET /api/vuelos), el registro es la LecturaHorometro asociada
// (GET /api/vuelos/:id/horometro), ya en estado "pendiente_validacion".
export default function TarjetaValidacionHorometro({ item, onValidado }) {
  const { usuario, validarHorometro } = useAuth();
  const { vuelo, registro } = item;

  const [expandido, setExpandido] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");

  const coincide = !!registro.coincidenciaHorometroInicial;
  const esSuperAdmin = !!usuario?.esSuperAdmin;
  const puedeValidar = esSuperAdmin || coincide;

  async function manejarValidar() {
    setError("");
    setProcesando(true);
    try {
      const datos = await validarHorometro(vuelo.id);
      onValidado(vuelo.id, datos.mensaje);
    } catch (err) {
      setError(err.response?.data?.mensaje || "No se pudo validar el registro.");
      setProcesando(false);
    }
  }

  return (
    <div className="tarjeta-recurso">
      <div className="tarjeta-recurso__cabecera">
        <span className="tarjeta-recurso__matricula">
          {vuelo.alumno?.nombre || "—"} · {vuelo.recurso?.matricula || "—"}
        </span>
        <span className={`estado-badge ${coincide ? "estado-badge--disponible" : "estado-badge--fuera_de_servicio"}`}>
          {coincide ? "Coincide" : "No coincide"}
        </span>
      </div>

      <p className="tarjeta-recurso__modelo">
        {vuelo.instructor?.nombre || "—"} · {formatoFechaCorta(vuelo.fechaHora)}
      </p>

      <button type="button" className="btn-chip btn-chip--secundario" onClick={() => setExpandido((v) => !v)}>
        {expandido ? "Ocultar detalle" : "Ver detalle"}
      </button>

      {expandido && (
        <div className="detalle-vuelo">
          <div className="detalle-vuelo__fila">
            <span className="detalle-vuelo__etiqueta">Horómetro inicial — sistema</span>
            <span>{numero(registro.horometroInicialSistema)}</span>
          </div>
          <div className="detalle-vuelo__fila">
            <span className="detalle-vuelo__etiqueta">Horómetro inicial — instructor</span>
            <span>{numero(registro.horometroInicialInstructor)}</span>
          </div>
          <div className="detalle-vuelo__fila">
            <span className="detalle-vuelo__etiqueta">Horómetro inicial — alumno</span>
            <span>{numero(registro.horometroInicialAlumno)}</span>
          </div>
          <div className="detalle-vuelo__fila">
            <span className="detalle-vuelo__etiqueta">Horómetro final — instructor</span>
            <span>{numero(registro.horometroFinalInstructor)}</span>
          </div>
          <div className="detalle-vuelo__fila">
            <span className="detalle-vuelo__etiqueta">Horómetro final — alumno</span>
            <span>{numero(registro.horometroFinalAlumno)}</span>
          </div>
          <div className="detalle-vuelo__fila">
            <span className="detalle-vuelo__etiqueta">Horas de sesión reportadas</span>
            <span>{numero(registro.horasSesionReportadas)}</span>
          </div>
          <div className="detalle-vuelo__fila">
            <span className="detalle-vuelo__etiqueta">Coherencia del horómetro final</span>
            <span>{registro.coherenciaHorometroFinal ? "Coherente" : "Con diferencia"}</span>
          </div>
          {registro.observaciones && (
            <div className="detalle-vuelo__fila">
              <span className="detalle-vuelo__etiqueta">Observaciones</span>
              <span>{registro.observaciones}</span>
            </div>
          )}
        </div>
      )}

      <div className="tarjeta-recurso__acciones-admin">
        {puedeValidar ? (
          <button type="button" className="btn-chip" disabled={procesando} onClick={manejarValidar}>
            {procesando ? "Validando..." : "Validar"}
          </button>
        ) : (
          <p className="subtitulo subtitulo--sin-margen">Requiere al super administrador.</p>
        )}
      </div>

      {error && <p className="mensaje-error">{error}</p>}
    </div>
  );
}
