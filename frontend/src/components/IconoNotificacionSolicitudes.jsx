import { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { hayNovedades } from "../utils/notificacionesSolicitudes";
import ModalNotificaciones from "./ModalNotificaciones";

// Campana de notificaciones: combina en un solo ícono dos flujos
// independientes — solicitudes de cambio sobre Recurso/Mantenimiento y
// horómetros pendientes de validación — con un aviso "!" cuando hay algo
// nuevo en cualquiera de los dos. Al hacer clic se abre un panel
// (ModalNotificaciones) que los separa en secciones, en vez de navegar
// directo a una sola pantalla.
//
// La revisión NO es un polling constante: solo se dispara al montar, en
// cada cambio de ruta (location.pathname) y al volver el foco a la
// pestaña (visibilitychange). No hay ningún temporizador de fondo.
export default function IconoNotificacionSolicitudes() {
  const {
    usuario,
    listarSolicitudesPendientes,
    listarHistorialSolicitudes,
    listarHorometrosPendientesValidacion,
  } = useAuth();
  const location = useLocation();
  const [tieneNovedades, setTieneNovedades] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);

  const esSuperAdmin = !!usuario?.esSuperAdmin;
  const esAdmin = usuario?.rol === "administrador";
  const puedeValidarHorometro = esSuperAdmin || !!usuario?.puedeValidarHorometro;

  const revisar = useCallback(async () => {
    if (!usuario || !esAdmin) return;
    try {
      const [datosSolicitudes, datosHorometros] = await Promise.all([
        esSuperAdmin ? listarSolicitudesPendientes() : listarHistorialSolicitudes(),
        puedeValidarHorometro ? listarHorometrosPendientesValidacion() : Promise.resolve(null),
      ]);

      const hayNovedadSolicitudes = hayNovedades(usuario.id, datosSolicitudes.solicitudes, {
        soloResueltas: !esSuperAdmin,
        espacio: "solicitudes",
      });

      const hayNovedadHorometros = datosHorometros
        ? hayNovedades(
            usuario.id,
            datosHorometros.pendientes.map((p) => ({ id: p.vueloId, estado: "pendiente_validacion" })),
            { espacio: "horometros" }
          )
        : false;

      setTieneNovedades(hayNovedadSolicitudes || hayNovedadHorometros);
    } catch {
      // si falla la consulta simplemente no se actualiza el aviso
    }
  }, [
    usuario,
    esAdmin,
    esSuperAdmin,
    puedeValidarHorometro,
    listarSolicitudesPendientes,
    listarHistorialSolicitudes,
    listarHorometrosPendientesValidacion,
  ]);

  // Momento 1 (montar) y momento 2 (cambio de ruta): al montar, location.pathname
  // ya tiene su valor inicial, así que este único efecto cubre ambos casos.
  useEffect(() => {
    revisar();
  }, [revisar, location.pathname]);

  // Momento 3: al volver a la pestaña (no en cada cambio de visibilidad, solo
  // cuando pasa a "visible").
  useEffect(() => {
    function alCambiarVisibilidad() {
      if (document.visibilityState === "visible") {
        revisar();
      }
    }
    document.addEventListener("visibilitychange", alCambiarVisibilidad);
    return () => document.removeEventListener("visibilitychange", alCambiarVisibilidad);
  }, [revisar]);

  if (!usuario || !esAdmin) return null;

  function manejarCerrarModal() {
    setModalAbierto(false);
    revisar();
  }

  return (
    <>
      <button
        type="button"
        className="encabezado__accion"
        onClick={() => setModalAbierto(true)}
        aria-label="Notificaciones"
        title="Notificaciones"
      >
        <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {tieneNovedades && (
          <span className="notificaciones-badge" aria-label="Hay novedades">
            !
          </span>
        )}
      </button>

      {modalAbierto && (
        <ModalNotificaciones
          esSuperAdmin={esSuperAdmin}
          puedeValidarHorometro={puedeValidarHorometro}
          onCerrar={manejarCerrarModal}
        />
      )}
    </>
  );
}
