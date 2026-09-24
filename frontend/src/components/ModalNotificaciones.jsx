import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { marcarComoVistas } from "../utils/notificacionesSolicitudes";

// Separa en dos secciones lo que antes eran dos íconos/enlaces distintos
// (solicitudes de cambio sobre Recurso/Mantenimiento vs. horómetros
// pendientes de validación) para que quede claro que son dos flujos
// independientes, sin relación con el calendario de vuelos.
//
// La sección de solicitudes es exclusiva del super admin (pendientes por
// aprobar): el historial completo se consulta ahora desde el menú lateral
// (PanelLateral), no desde esta campana.
export default function ModalNotificaciones({ esSuperAdmin, puedeValidarHorometro, onCerrar }) {
  const { usuario, listarSolicitudesPendientes, listarHorometrosPendientesValidacion } = useAuth();
  const navigate = useNavigate();

  const [solicitudes, setSolicitudes] = useState([]);
  const [horometros, setHorometros] = useState([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [datosSolicitudes, datosHorometros] = await Promise.all([
        esSuperAdmin ? listarSolicitudesPendientes() : Promise.resolve(null),
        puedeValidarHorometro ? listarHorometrosPendientesValidacion() : Promise.resolve(null),
      ]);
      setSolicitudes(datosSolicitudes ? datosSolicitudes.solicitudes : []);
      setHorometros(datosHorometros ? datosHorometros.pendientes : []);
    } catch {
      // si falla, los contadores simplemente no se muestran
    } finally {
      setCargando(false);
    }
  }, [esSuperAdmin, puedeValidarHorometro, listarSolicitudesPendientes, listarHorometrosPendientesValidacion]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  function irASolicitudes() {
    marcarComoVistas(usuario.id, solicitudes, "solicitudes");
    onCerrar();
    navigate("/panel/solicitudes");
  }

  function irAHorometros() {
    marcarComoVistas(
      usuario.id,
      horometros.map((p) => ({ id: p.vueloId, estado: "pendiente_validacion" })),
      "horometros"
    );
    onCerrar();
    navigate("/panel/validar-horometro");
  }

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <div className="modal-caja" onClick={(e) => e.stopPropagation()}>
        <h2>Notificaciones</h2>

        {cargando ? (
          <p className="subtitulo">Cargando...</p>
        ) : (
          <>
            {esSuperAdmin && (
              <div className="notificaciones-seccion">
                <h3>Solicitudes pendientes</h3>
                <p className="subtitulo">{solicitudes.length} solicitud(es) esperando tu aprobación.</p>
                <div className="tarjeta-recurso__acciones-admin">
                  <button type="button" className="btn-chip" onClick={irASolicitudes}>
                    Ver solicitudes pendientes
                  </button>
                </div>
              </div>
            )}

            {puedeValidarHorometro && (
              <div className="notificaciones-seccion">
                <h3>Horómetros pendientes de validación</h3>
                <p className="subtitulo">{horometros.length} registro(s) esperando validación.</p>
                <div className="tarjeta-recurso__acciones-admin">
                  <button type="button" className="btn-chip" onClick={irAHorometros}>
                    Ver horómetros pendientes
                  </button>
                </div>
              </div>
            )}
          </>
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
