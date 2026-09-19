import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { marcarComoVistas, hayNovedades } from "../utils/notificacionesSolicitudes";

// Campana de notificaciones para el flujo de solicitudes: reemplaza los
// enlaces de texto "Solicitudes pendientes" (super admin) / "Mis
// solicitudes" (administrador regular) por un solo ícono en la esquina
// superior derecha, con un aviso "!" cuando hay algo nuevo que revisar.
//
// La revisión NO es un polling constante: solo se dispara al montar, en
// cada cambio de ruta (location.pathname) y al volver el foco a la
// pestaña (visibilitychange). No hay ningún temporizador de fondo.
export default function IconoNotificacionSolicitudes() {
  const { usuario, listarSolicitudesPendientes, listarMisSolicitudes } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [tieneNovedades, setTieneNovedades] = useState(false);

  const esSuperAdmin = !!usuario?.esSuperAdmin;
  const esAdmin = usuario?.rol === "administrador";
  const rutaDestino = esSuperAdmin ? "/panel/solicitudes" : "/panel/mis-solicitudes";

  const obtenerSolicitudes = useCallback(() => {
    return esSuperAdmin ? listarSolicitudesPendientes() : listarMisSolicitudes();
  }, [esSuperAdmin, listarSolicitudesPendientes, listarMisSolicitudes]);

  const revisar = useCallback(async () => {
    if (!usuario || !esAdmin) return;
    try {
      const datos = await obtenerSolicitudes();
      setTieneNovedades(hayNovedades(usuario.id, datos.solicitudes, { soloResueltas: !esSuperAdmin }));
    } catch {
      // si falla la consulta simplemente no se actualiza el aviso
    }
  }, [usuario, esAdmin, esSuperAdmin, obtenerSolicitudes]);

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

  async function manejarClic() {
    try {
      const datos = await obtenerSolicitudes();
      marcarComoVistas(usuario.id, datos.solicitudes);
    } catch {
      // si falla, se navega igual; la próxima revisión (cambio de ruta) lo corrige
    }
    setTieneNovedades(false);
    navigate(rutaDestino);
  }

  const etiqueta = esSuperAdmin ? "Solicitudes pendientes" : "Mis solicitudes";

  return (
    <button
      type="button"
      className="encabezado__accion"
      onClick={manejarClic}
      aria-label={etiqueta}
      title={etiqueta}
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
  );
}
