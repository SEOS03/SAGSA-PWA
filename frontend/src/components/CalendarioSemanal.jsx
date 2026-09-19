import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import ModalDetalleVuelo from "./ModalDetalleVuelo";
import ModalFormularioVuelo from "./ModalFormularioVuelo";
import { obtenerLunes, sumarDias, obtenerDiasSemana, mismoDia, formatoDiaCorto, formatoRangoSemana } from "../utils/semana";

const PESTANAS = [
  { valor: "aeronaves", etiqueta: "Aeronaves" },
  { valor: "simuladores", etiqueta: "Simuladores" },
];

const HORA_INICIO = 6; // 06:00
const HORA_FIN = 18; // 18:00
const NUM_HORAS = HORA_FIN - HORA_INICIO; // 12 filas (cuadrícula visual, 1 hora c/u)
const PX_POR_HORA = 64;
const ALTURA_TOTAL = NUM_HORAS * PX_POR_HORA;
const HORAS_ETIQUETAS = Array.from({ length: NUM_HORAS }, (_, i) => HORA_INICIO + i);

// El renderizado de vuelos existentes sigue usando la cuadrícula de 1 hora
// de arriba; la creación de vuelos nuevos, en cambio, opera en bloques FIJOS
// de 2 horas (6 bloques por día) independientemente de esa cuadrícula visual.
const HORAS_BLOQUE = 2;
const NUM_BLOQUES = NUM_HORAS / HORAS_BLOQUE;

function calcularIndiceBloque(offsetY) {
  const horaDecimal = HORA_INICIO + offsetY / PX_POR_HORA;
  const indice = Math.floor((horaDecimal - HORA_INICIO) / HORAS_BLOQUE);
  return Math.max(0, Math.min(NUM_BLOQUES - 1, indice));
}

function rangoBloque(indice) {
  const inicio = HORA_INICIO + indice * HORAS_BLOQUE;
  return [inicio, inicio + HORAS_BLOQUE];
}

function esDeTipo(vuelo, pestana) {
  const tipo = vuelo.recurso?.tipoRecurso;
  return pestana === "aeronaves" ? tipo !== "simulador" : tipo === "simulador";
}

function rangoMs(vuelo) {
  const inicio = new Date(vuelo.fechaHora).getTime();
  return [inicio, inicio + Number(vuelo.duracionMinutos) * 60000];
}

// Asigna un "carril" a cada vuelo del día para que los que se solapan en
// horario (ej. dos recursos distintos a la misma hora) queden uno al lado
// del otro en vez de encimados, sin duplicar ningún bloque.
function calcularCarriles(vuelosDelDia) {
  const ordenados = [...vuelosDelDia].sort((a, b) => new Date(a.fechaHora) - new Date(b.fechaHora));
  const finPorCarril = [];

  const conCarril = ordenados.map((vuelo) => {
    const [inicio, fin] = rangoMs(vuelo);
    let carril = finPorCarril.findIndex((finExistente) => finExistente <= inicio);
    if (carril === -1) {
      carril = finPorCarril.length;
      finPorCarril.push(fin);
    } else {
      finPorCarril[carril] = fin;
    }
    return { vuelo, carril, inicio, fin };
  });

  return conCarril.map((item) => {
    const totalCarriles =
      conCarril
        .filter((otro) => otro.inicio < item.fin && otro.fin > item.inicio)
        .reduce((max, otro) => Math.max(max, otro.carril), 0) + 1;
    return { ...item, totalCarriles };
  });
}

function calcularPosicion(vuelo) {
  const inicio = new Date(vuelo.fechaHora);
  const horaDecimal = inicio.getHours() + inicio.getMinutes() / 60;
  const top = Math.max(0, Math.min(ALTURA_TOTAL, (horaDecimal - HORA_INICIO) * PX_POR_HORA));
  const alturaCruda = (Number(vuelo.duracionMinutos) / 60) * PX_POR_HORA;
  const altura = Math.max(30, Math.min(ALTURA_TOTAL - top, alturaCruda));
  return { top, altura };
}

const ETIQUETAS_ESTADO_VUELO = {
  en_proceso: "En proceso",
  confirmado: "Confirmado",
  en_curso: "En curso",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};

const MENSAJE_GUIA_VUELO = "Selecciona un espacio vacío en el calendario para agendar un vuelo.";

export default function CalendarioSemanal({ mensajeGuiaTrigger }) {
  const { usuario, listarRecursos, listarVuelos } = useAuth();

  const [lunes, setLunes] = useState(() => obtenerLunes(new Date()));
  const [pestana, setPestana] = useState("aeronaves");
  const [recursos, setRecursos] = useState([]);
  const [seleccionados, setSeleccionados] = useState(() => new Set());
  const [vuelos, setVuelos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");
  const [mensajeGuia, setMensajeGuia] = useState("");
  const [vueloSeleccionado, setVueloSeleccionado] = useState(null);
  const [bloqueHover, setBloqueHover] = useState(null); // { dia, indice }
  const [formularioAbierto, setFormularioAbierto] = useState(null); // null | { fecha, horaInicio, recursoId, tipoRecurso }

  // El enlace "Programar vuelo" del menú lateral ya no abre el panel
  // flotante directamente (ver ModalFormularioVuelo): solo trae al usuario
  // aquí y muestra este aviso temporal, con un valor nuevo en cada clic
  // (ver PanelLateral) para que el efecto dispare aunque ya estés en /panel.
  useEffect(() => {
    if (!mensajeGuiaTrigger) return;
    setMensajeGuia(MENSAJE_GUIA_VUELO);
    const temporizador = setTimeout(() => setMensajeGuia(""), 6000);
    return () => clearTimeout(temporizador);
  }, [mensajeGuiaTrigger]);

  const diasSemana = useMemo(() => obtenerDiasSemana(lunes), [lunes]);

  // Recursos se cargan una sola vez: la lista no cambia al navegar de
  // semana, solo el filtrado por pestaña/checkboxes (en memoria).
  useEffect(() => {
    listarRecursos()
      .then((datos) => setRecursos(datos.recursos))
      .catch(() => setError("No se pudieron cargar los recursos."));
  }, [listarRecursos]);

  const recursosFiltrados = useMemo(
    () =>
      recursos.filter((r) =>
        pestana === "aeronaves" ? r.tipoRecurso !== "simulador" : r.tipoRecurso === "simulador"
      ),
    [recursos, pestana]
  );

  // Al cambiar de pestaña (o al llegar los recursos), todos quedan
  // seleccionados por defecto para esa categoría.
  useEffect(() => {
    setSeleccionados(new Set(recursosFiltrados.map((r) => r.id)));
  }, [recursosFiltrados]);

  const cargarVuelos = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const domingo = sumarDias(lunes, 6);
      domingo.setHours(23, 59, 59, 999);
      const datos = await listarVuelos({ desde: lunes.toISOString(), hasta: domingo.toISOString() });
      setVuelos(datos.vuelos);
    } catch {
      setError("No se pudieron cargar los vuelos de esta semana.");
    } finally {
      setCargando(false);
    }
  }, [lunes, listarVuelos]);

  useEffect(() => {
    cargarVuelos();
  }, [cargarVuelos]);

  function esPropio(vuelo) {
    if (usuario?.rol === "instructor") return Number(vuelo.instructorId) === Number(usuario.id);
    if (usuario?.rol === "alumno") return Number(vuelo.alumnoId) === Number(usuario.id);
    return false;
  }

  const vuelosVisibles = useMemo(
    () => vuelos.filter((v) => esDeTipo(v, pestana) && seleccionados.has(Number(v.recursoId))),
    [vuelos, pestana, seleccionados]
  );

  function vuelosDelDia(dia) {
    return vuelosVisibles.filter((v) => mismoDia(new Date(v.fechaHora), dia));
  }

  // Un bloque de 2 horas se considera disponible para crear un vuelo si, de
  // los recursos actualmente visibles en el filtro, al menos uno no tiene
  // ningún vuelo que se cruce con ese rango (aunque sea parcialmente).
  function bloqueDisponibleParaAlgunRecurso(dia, indice) {
    const [horaInicioBloque, horaFinBloque] = rangoBloque(indice);
    const inicioMs = new Date(dia).setHours(horaInicioBloque, 0, 0, 0);
    const finMs = new Date(dia).setHours(horaFinBloque, 0, 0, 0);
    const vuelosDia = vuelosDelDia(dia);

    return Array.from(seleccionados).some((recursoId) => {
      const ocupado = vuelosDia.some((v) => {
        if (Number(v.recursoId) !== Number(recursoId)) return false;
        const [vIni, vFin] = rangoMs(v);
        return vIni < finMs && vFin > inicioMs;
      });
      return !ocupado;
    });
  }

  function manejarMouseMoveDia(e, dia) {
    const rect = e.currentTarget.getBoundingClientRect();
    const indice = calcularIndiceBloque(e.clientY - rect.top);
    setBloqueHover((prev) => (prev && mismoDia(prev.dia, dia) && prev.indice === indice ? prev : { dia, indice }));
  }

  function manejarClickDia(e, dia) {
    const rect = e.currentTarget.getBoundingClientRect();
    const indice = calcularIndiceBloque(e.clientY - rect.top);

    if (bloqueDisponibleParaAlgunRecurso(dia, indice)) {
      const [horaInicioBloque] = rangoBloque(indice);
      const recursoUnico = seleccionados.size === 1 ? Array.from(seleccionados)[0] : null;

      setFormularioAbierto({
        fecha: dia,
        horaInicio: `${String(horaInicioBloque).padStart(2, "0")}:00`,
        recursoId: recursoUnico,
        tipoRecurso: pestana,
      });
      return;
    }

    // El bloque está ocupado para todos los recursos seleccionados: en vez
    // de crear uno nuevo, se muestra el detalle del vuelo correspondiente.
    const [horaInicioBloque, horaFinBloque] = rangoBloque(indice);
    const inicioMs = new Date(dia).setHours(horaInicioBloque, 0, 0, 0);
    const finMs = new Date(dia).setHours(horaFinBloque, 0, 0, 0);

    const vueloEnBloque = vuelosDelDia(dia).find((v) => {
      if (!seleccionados.has(Number(v.recursoId))) return false;
      const [vIni, vFin] = rangoMs(v);
      return vIni < finMs && vFin > inicioMs;
    });

    if (vueloEnBloque) {
      setVueloSeleccionado(vueloEnBloque);
    }
  }

  function manejarExitoFormulario(mensaje) {
    setFormularioAbierto(null);
    setMensajeExito(mensaje);
    cargarVuelos();
  }

  function alternarRecurso(id) {
    setSeleccionados((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(id)) siguiente.delete(id);
      else siguiente.add(id);
      return siguiente;
    });
  }

  function alternarTodos() {
    setSeleccionados((prev) =>
      prev.size === recursosFiltrados.length ? new Set() : new Set(recursosFiltrados.map((r) => r.id))
    );
  }

  const todosMarcados = recursosFiltrados.length > 0 && seleccionados.size === recursosFiltrados.length;

  return (
    <div className="calendario">
      <div className="calendario-navegacion">
        <button type="button" className="btn-chip btn-chip--secundario" onClick={() => setLunes((l) => sumarDias(l, -7))}>
          ‹ Semana anterior
        </button>
        <span className="calendario-rango">{formatoRangoSemana(lunes)}</span>
        <button type="button" className="btn-chip btn-chip--secundario" onClick={() => setLunes((l) => sumarDias(l, 7))}>
          Semana siguiente ›
        </button>
      </div>

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

      {recursosFiltrados.length > 0 && (
        <div className="calendario-filtros">
          <label className="calendario-filtro-item calendario-filtro-item--todos">
            <input type="checkbox" checked={todosMarcados} onChange={alternarTodos} />
            Todos
          </label>
          {recursosFiltrados.map((recurso) => (
            <label key={recurso.id} className="calendario-filtro-item">
              <input
                type="checkbox"
                checked={seleccionados.has(recurso.id)}
                onChange={() => alternarRecurso(recurso.id)}
              />
              {recurso.matricula}
            </label>
          ))}
        </div>
      )}

      {mensajeGuia && <p className="mensaje-guia">{mensajeGuia}</p>}
      {mensajeExito && <p className="mensaje-exito">{mensajeExito}</p>}
      {error && <p className="mensaje-error">{error}</p>}

      {cargando ? (
        <p className="subtitulo">Cargando calendario...</p>
      ) : recursosFiltrados.length === 0 ? (
        <p className="subtitulo">No hay recursos registrados en esta categoría.</p>
      ) : (
        <div className="calendario-scroll">
          <div className="calendario-tabla" style={{ gridTemplateColumns: "70px repeat(7, minmax(140px, 1fr))" }}>
            <div className="calendario-celda-esquina calendario-celda-fija" />
            {diasSemana.map((dia) => (
              <div key={dia.toISOString()} className="calendario-celda-encabezado">
                {formatoDiaCorto(dia)}
              </div>
            ))}

            <div className="calendario-horas calendario-celda-fija" style={{ height: `${ALTURA_TOTAL}px` }}>
              {HORAS_ETIQUETAS.map((hora) => (
                <div key={hora} className="calendario-hora-etiqueta" style={{ height: `${PX_POR_HORA}px` }}>
                  {String(hora).padStart(2, "0")}:00
                </div>
              ))}
            </div>

            {diasSemana.map((dia) => {
              const conCarriles = calcularCarriles(vuelosDelDia(dia));
              const hoverAqui = bloqueHover && mismoDia(bloqueHover.dia, dia) ? bloqueHover : null;
              const hoverDisponible = hoverAqui ? bloqueDisponibleParaAlgunRecurso(dia, hoverAqui.indice) : false;

              return (
                <div
                  key={dia.toISOString()}
                  className="calendario-dia"
                  style={{ height: `${ALTURA_TOTAL}px`, cursor: hoverDisponible ? "pointer" : "default" }}
                  onMouseMove={(e) => manejarMouseMoveDia(e, dia)}
                  onMouseLeave={() => setBloqueHover(null)}
                  onClick={(e) => manejarClickDia(e, dia)}
                >
                  {hoverAqui && hoverDisponible && (
                    <div
                      className="calendario-bloque-hover"
                      style={{
                        top: `${hoverAqui.indice * HORAS_BLOQUE * PX_POR_HORA}px`,
                        height: `${HORAS_BLOQUE * PX_POR_HORA}px`,
                      }}
                    />
                  )}

                  {conCarriles.map(({ vuelo, carril, totalCarriles }) => {
                    const { top, altura } = calcularPosicion(vuelo);
                    const clases = [
                      "vuelo-bloque",
                      `vuelo-bloque--${vuelo.estado}`,
                      esPropio(vuelo) ? "vuelo-bloque--propio" : "",
                    ]
                      .filter(Boolean)
                      .join(" ");
                    const hora = new Date(vuelo.fechaHora).toLocaleTimeString("es-GT", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    return (
                      <button
                        key={vuelo.id}
                        type="button"
                        className={clases}
                        style={{
                          top: `${top}px`,
                          height: `${altura}px`,
                          left: `calc(${(carril / totalCarriles) * 100}% + 2px)`,
                          width: `calc(${100 / totalCarriles}% - 4px)`,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setVueloSeleccionado(vuelo);
                        }}
                        title={`${ETIQUETAS_ESTADO_VUELO[vuelo.estado] || vuelo.estado} — ${vuelo.instructor?.nombre || "?"} · ${hora}`}
                      >
                        <span className="vuelo-bloque__alumno">{vuelo.alumno?.nombre || "—"}</span>
                        <span className="vuelo-bloque__recurso">{vuelo.recurso?.matricula || "—"}</span>
                        <span className="vuelo-bloque__secundario">
                          {vuelo.instructor?.nombre || "—"} · {hora}
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p className="calendario-leyenda">
        <span className="calendario-leyenda__item">
          <span className="calendario-punto calendario-punto--en_proceso" /> En proceso
        </span>
        <span className="calendario-leyenda__item">
          <span className="calendario-punto calendario-punto--confirmado" /> Confirmado
        </span>
        <span className="calendario-leyenda__item">
          <span className="calendario-punto calendario-punto--finalizado" /> Finalizado
        </span>
        <span className="calendario-leyenda__item">
          <span className="calendario-punto calendario-punto--cancelado" /> Cancelado
        </span>
        {(usuario?.rol === "instructor" || usuario?.rol === "alumno") && (
          <span className="calendario-leyenda__item">
            <span className="calendario-punto calendario-punto--propio" /> Mis vuelos
          </span>
        )}
      </p>

      {vueloSeleccionado && (
        <ModalDetalleVuelo
          vuelo={vueloSeleccionado}
          onCerrar={() => setVueloSeleccionado(null)}
          onCambio={cargarVuelos}
        />
      )}

      {formularioAbierto && (
        <ModalFormularioVuelo
          precarga={formularioAbierto}
          onCerrar={() => setFormularioAbierto(null)}
          onExito={manejarExitoFormulario}
        />
      )}
    </div>
  );
}
