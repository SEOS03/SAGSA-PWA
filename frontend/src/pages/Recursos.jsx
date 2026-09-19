import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Encabezado from "../components/Encabezado";
import TarjetaRecurso from "../components/TarjetaRecurso";
import ModalMantenimiento from "../components/ModalMantenimiento";

const PESTANAS = [
  { valor: "aeronaves", etiqueta: "Aeronaves" },
  { valor: "simuladores", etiqueta: "Simuladores" },
];

export default function Recursos() {
  const { usuario, listarRecursos, listarMantenimientos, darDeBajaRecurso } = useAuth();
  const [recursos, setRecursos] = useState([]);
  const [pestana, setPestana] = useState("aeronaves");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensajeGlobal, setMensajeGlobal] = useState("");
  const [modal, setModal] = useState(null); // { modo, recurso, mantenimiento? }

  const cargar = useCallback(async () => {
    setError("");
    try {
      const datos = await listarRecursos();
      setRecursos(datos.recursos);
    } catch (err) {
      setError(err.response?.data?.mensaje || "No se pudieron cargar los recursos.");
    } finally {
      setCargando(false);
    }
  }, [listarRecursos]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const recursosFiltrados = recursos.filter((r) =>
    pestana === "aeronaves" ? r.tipoRecurso !== "simulador" : r.tipoRecurso === "simulador"
  );

  async function abrirFinalizar(recurso) {
    setError("");
    try {
      const datos = await listarMantenimientos(recurso.id);
      const activo = datos.mantenimientos.find((m) => m.estado === "en_proceso");
      if (!activo) {
        setError("No se encontró un mantenimiento en curso para este recurso.");
        return;
      }
      setModal({ modo: "finalizar", recurso, mantenimiento: activo });
    } catch (err) {
      setError(err.response?.data?.mensaje || "No se pudo obtener el mantenimiento en curso.");
    }
  }

  async function manejarBaja(recurso) {
    if (!window.confirm(`¿Dar de baja el recurso ${recurso.matricula}?`)) return;
    setError("");
    try {
      const datos = await darDeBajaRecurso(recurso.id);
      setMensajeGlobal(datos.mensaje);
      cargar();
    } catch (err) {
      setError(err.response?.data?.mensaje || "No se pudo dar de baja el recurso.");
    }
  }

  function manejarExitoModal(mensaje) {
    setModal(null);
    setMensajeGlobal(mensaje);
    cargar();
  }

  return (
    <>
      <Encabezado subtitulo="Recursos" />
      <div className="pagina">
        <div className="contenedor-ancho">
          <div className="encabezado-seccion">
            <h1>Recursos</h1>
            {usuario?.esSuperAdmin && (
              <div className="encabezado-seccion__enlaces">
                <Link className="btn-chip btn-chip--secundario" to="/panel/recursos/nuevo">
                  + Nuevo recurso
                </Link>
              </div>
            )}
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

          {mensajeGlobal && <p className="mensaje-exito">{mensajeGlobal}</p>}
          {error && <p className="mensaje-error">{error}</p>}

          {cargando ? (
            <p className="subtitulo">Cargando recursos...</p>
          ) : recursosFiltrados.length === 0 ? (
            <p className="subtitulo">No hay recursos registrados en esta categoría.</p>
          ) : (
            <div className="lista-recursos">
              {recursosFiltrados.map((recurso) => (
                <TarjetaRecurso
                  key={recurso.id}
                  recurso={recurso}
                  onCambio={cargar}
                  onAbrirMantenimiento={(r) => setModal({ modo: "registrar", recurso: r })}
                  onAbrirFinalizar={abrirFinalizar}
                  onDarDeBaja={manejarBaja}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {modal && (
        <ModalMantenimiento
          modo={modal.modo}
          recurso={modal.recurso}
          mantenimiento={modal.mantenimiento}
          onCerrar={() => setModal(null)}
          onExito={manejarExitoModal}
        />
      )}
    </>
  );
}
