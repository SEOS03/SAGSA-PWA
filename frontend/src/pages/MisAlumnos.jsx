import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import Encabezado from "../components/Encabezado";
import BarraProgreso from "../components/BarraProgreso";
import IndicadorCumplimiento from "../components/IndicadorCumplimiento";

const ETIQUETAS_PROGRAMA = {
  piloto_privado: "Piloto privado",
  ifr: "IFR",
  bimotor: "Bimotor",
  comercial: "Comercial",
};

export default function MisAlumnos() {
  const { obtenerMisAlumnos } = useAuth();
  const [progresos, setProgresos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const datos = await obtenerMisAlumnos();
      setProgresos(datos.progresos);
    } catch (err) {
      setError(err.response?.data?.mensaje || "No se pudieron cargar tus alumnos asignados.");
    } finally {
      setCargando(false);
    }
  }, [obtenerMisAlumnos]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return (
    <>
      <Encabezado subtitulo="Mis alumnos" />
      <div className="pagina">
        <div className="contenedor-ancho">
          <h1>Mis alumnos</h1>
          <p className="subtitulo">Avance de los alumnos que tienes asignados como instructor.</p>

          {error && <p className="mensaje-error">{error}</p>}

          {cargando ? (
            <p className="subtitulo">Cargando...</p>
          ) : progresos.length === 0 ? (
            <p className="subtitulo">Todavía no tienes alumnos asignados.</p>
          ) : (
            <div className="lista-recursos">
              {progresos.map((p) => (
                <div key={p.id} className="tarjeta-recurso">
                  <div className="tarjeta-recurso__cabecera">
                    <span className="tarjeta-recurso__matricula">{p.alumno?.nombre || "—"}</span>
                  </div>
                  <p className="tarjeta-recurso__modelo">{ETIQUETAS_PROGRAMA[p.Programa?.nombre] || p.Programa?.nombre}</p>
                  <p className="tarjeta-recurso__modelo">
                    Horas simulador: {Number(p.horasSimuladorAcumuladas)} / {Number(p.Programa?.horasSimuladorTotal ?? 0)}
                    {" · "}
                    Horas avión: {Number(p.horasAvionAcumuladas)} / {Number(p.Programa?.horasAvionTotal ?? 0)}
                  </p>
                  <BarraProgreso porcentaje={p.cumplimiento?.pctTotal ?? 0} />
                  <div className="indicador-cumplimiento">
                    <IndicadorCumplimiento cumplimiento={p.cumplimiento} />
                  </div>
                  {p.Programa?.totalLecciones != null && (
                    <p className="subtitulo">
                      Lección actual: {p.leccionActual} / {p.Programa.totalLecciones}
                    </p>
                  )}
                  <p className="subtitulo">Vuelo solo: {p.vueloSoloCompletado ? "Completado" : "Pendiente"}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
