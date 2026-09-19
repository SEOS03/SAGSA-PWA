// Rastrea, por usuario, el último estado visto de cada solicitud (propia si
// es administrador regular, o pendiente si es super admin) para poder
// mostrar un aviso "!" cuando algo cambió desde la última vez que revisó.
// No requiere backend: se guarda en localStorage, por eso es "visto" a nivel
// de este dispositivo/navegador, no una notificación real entre sesiones.

function clave(usuarioId) {
  return `sagsa_solicitudes_estado_${usuarioId}`;
}

export function leerEstadoGuardado(usuarioId) {
  try {
    const crudo = localStorage.getItem(clave(usuarioId));
    return crudo ? JSON.parse(crudo) : {};
  } catch {
    return {};
  }
}

export function marcarComoVistas(usuarioId, solicitudes) {
  const mapa = {};
  (solicitudes || []).forEach((s) => {
    mapa[s.id] = s.estado;
  });
  try {
    localStorage.setItem(clave(usuarioId), JSON.stringify(mapa));
  } catch {
    // almacenamiento no disponible (modo privado, cuota llena, etc.): no
    // persiste entre sesiones, pero no debe romper la navegación.
  }
}

// Hay novedad si alguna solicitud tiene un estado distinto al que se vio la
// última vez (incluye el caso de nunca haberla visto todavía).
//
// `soloResueltas` es para el administrador regular viendo SUS PROPIAS
// solicitudes: una que él mismo acaba de enviar y sigue "pendiente" no es
// una novedad (la acaba de crear); solo cuenta cuando alguien ya la
// aprobó o rechazó. El super admin sí debe enterarse de cualquier
// solicitud pendiente nueva, por eso no aplica ese filtro.
export function hayNovedades(usuarioId, solicitudes, { soloResueltas = false } = {}) {
  const anterior = leerEstadoGuardado(usuarioId);
  return (solicitudes || []).some((s) => {
    if (soloResueltas && s.estado === "pendiente") return false;
    return anterior[s.id] !== s.estado;
  });
}
