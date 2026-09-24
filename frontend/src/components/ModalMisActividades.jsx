const ETIQUETAS_ESTADO_VUELO = {
  en_proceso: "En proceso",
  confirmado: "Confirmado",
  en_curso: "En curso",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};

function formatoFechaHora(fechaIso) {
  return new Date(fechaIso).toLocaleString("es-GT", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Filtra, sobre los vuelos de la semana ya cargados en CalendarioSemanal (sin
// fetch propio), los que le corresponden al usuario autenticado: instructor
// o alumno ven solo aquellos en los que participan, admin/super admin ven
// todos. Al seleccionar uno se cierra este panel y se abre su detalle
// (ModalDetalleVuelo), reutilizando el mismo vueloSeleccionado del calendario.
export default function ModalMisActividades({ vuelos, usuario, onCerrar, onSeleccionar }) {
  const esAdmin = usuario?.rol === "administrador";

  const propios = vuelos
    .filter((v) => {
      if (esAdmin) return true;
      if (usuario?.rol === "instructor") return Number(v.instructorId) === Number(usuario.id);
      if (usuario?.rol === "alumno") return Number(v.alumnoId) === Number(usuario.id);
      return false;
    })
    .sort((a, b) => new Date(a.fechaHora) - new Date(b.fechaHora));

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <div className="modal-caja" onClick={(e) => e.stopPropagation()}>
        <h2>Mis actividades</h2>
        <p className="subtitulo">
          {esAdmin ? "Vuelos de la semana visible." : "Vuelos de la semana visible en los que participas."}
        </p>

        {propios.length === 0 ? (
          <p className="subtitulo">No hay vuelos que mostrar en esta semana.</p>
        ) : (
          <div className="lista-recursos">
            {propios.map((vuelo) => (
              <button
                key={vuelo.id}
                type="button"
                className="tarjeta-recurso tarjeta-recurso--boton"
                onClick={() => onSeleccionar(vuelo)}
              >
                <div className="tarjeta-recurso__cabecera">
                  <span className="tarjeta-recurso__matricula">
                    {vuelo.recurso?.matricula || `Recurso #${vuelo.recursoId}`}
                  </span>
                  <span className="calendario-leyenda__item">
                    <span className={`calendario-punto calendario-punto--${vuelo.estado}`} />
                    {ETIQUETAS_ESTADO_VUELO[vuelo.estado] || vuelo.estado}
                  </span>
                </div>
                <p className="tarjeta-recurso__modelo">{formatoFechaHora(vuelo.fechaHora)}</p>
                <p className="subtitulo">
                  Instructor: {vuelo.instructor?.nombre || "—"} · Alumno: {vuelo.alumno?.nombre || "—"}
                </p>
              </button>
            ))}
          </div>
        )}

        <div className="modal-caja__acciones">
          <button type="button" className="btn-chip btn-chip--secundario" onClick={onCerrar}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
