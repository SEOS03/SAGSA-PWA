import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import Encabezado from "../components/Encabezado";
import BarraProgreso from "../components/BarraProgreso";
import { calcularProgreso } from "../utils/calcularProgreso";

const ETIQUETAS_PROGRAMA = {
  piloto_privado: "Piloto privado",
  ifr: "IFR",
  bimotor: "Bimotor",
  comercial: "Comercial",
};

export default function MiProgreso() {
  const { obtenerMiProgreso } = useAuth();
  const [progresos, setProgresos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const datos = await obtenerMiProgreso();
      setProgresos(datos.progresos);
    } catch (err) {
      setError(err.response?.data?.mensaje || "No se pudo cargar tu progreso.");
    } finally {
      setCargando(false);
    }
  }, [obtenerMiProgreso]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return (
    <>
      <Encabezado subtitulo="Mi progreso" />
      <div className="pagina">
        <div className="contenedor-ancho">
          <h1>Mi progreso</h1>
          <p className="subtitulo">Tu avance en los programas de instrucción en los que estás inscrito.</p>

          {error && <p className="mensaje-error">{error}</p>}

          {cargando ? (
            <p className="subtitulo">Cargando...</p>
          ) : progresos.length === 0 ? (
            <p className="subtitulo">Todavía no tienes ninguna inscripción activa en un programa.</p>
          ) : (
            <div className="lista-recursos">
              {progresos.map((p) => (
                <div key={p.id} className="tarjeta-recurso">
                  <div className="tarjeta-recurso__cabecera">
                    <span className="tarjeta-recurso__matricula">
                      {ETIQUETAS_PROGRAMA[p.Programa?.nombre] || p.Programa?.nombre}
                    </span>
                  </div>
                  <p className="tarjeta-recurso__modelo">
                    Horas simulador: {Number(p.horasSimuladorAcumuladas)} / {Number(p.Programa?.horasSimuladorTotal ?? 0)}
                    {" · "}
                    Horas avión: {Number(p.horasAvionAcumuladas)} / {Number(p.Programa?.horasAvionTotal ?? 0)}
                  </p>
                  <BarraProgreso porcentaje={calcularProgreso(p)} />
                  {p.Programa?.totalLecciones != null && (
                    <p className="subtitulo">
                      Lección actual: {p.leccionActual} / {p.Programa.totalLecciones}
                    </p>
                  )}
                  <p className="subtitulo">Vuelo solo: {p.vueloSoloCompletado ? "Completado" : "Pendiente"}</p>
                  <p className="subtitulo">Instructor asignado: {p.instructorAsignado?.nombre || "Sin asignar"}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
