import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import Encabezado from "../components/Encabezado";
import TarjetaValidacionHorometro from "../components/TarjetaValidacionHorometro";

// Adapta un elemento de GET /vuelos/horometros/pendientes-validacion (todo
// en un solo nivel) a la forma { vuelo, registro } que ya espera
// TarjetaValidacionHorometro, para no tener que tocar ese componente.
function adaptarPendiente(p) {
  return {
    vuelo: { id: p.vueloId, recurso: p.recurso, instructor: p.instructor, alumno: p.alumno, fechaHora: p.fechaHora },
    registro: {
      horometroInicialSistema: p.horometroInicialSistema,
      horometroInicialInstructor: p.horometroInicialInstructor,
      horometroFinalInstructor: p.horometroFinalInstructor,
      horometroInicialAlumno: p.horometroInicialAlumno,
      horometroFinalAlumno: p.horometroFinalAlumno,
      horasSesionReportadas: p.horasSesionReportadas,
      observaciones: p.observaciones,
      coincidenciaHorometroInicial: p.coincidenciaHorometroInicial,
      coherenciaHorometroFinal: p.coherenciaHorometroFinal,
    },
  };
}

export default function ValidarHorometro() {
  const { listarHorometrosPendientesValidacion } = useAuth();
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const datos = await listarHorometrosPendientesValidacion();
      setItems(datos.pendientes.map(adaptarPendiente));
    } catch (err) {
      setError(err.response?.data?.mensaje || "No se pudieron cargar los registros pendientes.");
    } finally {
      setCargando(false);
    }
  }, [listarHorometrosPendientesValidacion]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  function manejarValidado(vueloId, mensajeExito) {
    setItems((prev) => prev.filter((item) => item.vuelo.id !== vueloId));
    setMensaje(mensajeExito);
  }

  return (
    <>
      <Encabezado subtitulo="Validar horómetro" />
      <div className="pagina">
        <div className="contenedor-ancho">
          <h1>Validar horómetro</h1>
          <p className="subtitulo">Registros de horómetro esperando validación.</p>

          {mensaje && <p className="mensaje-exito">{mensaje}</p>}
          {error && <p className="mensaje-error">{error}</p>}

          {cargando ? (
            <p className="subtitulo">Cargando...</p>
          ) : items.length === 0 ? (
            <p className="subtitulo">No hay registros pendientes de validación.</p>
          ) : (
            <div className="lista-recursos">
              {items.map((item) => (
                <TarjetaValidacionHorometro key={item.vuelo.id} item={item} onValidado={manejarValidado} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
