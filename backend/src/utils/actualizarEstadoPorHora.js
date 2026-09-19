// Verificación perezosa (no hay cron): un vuelo "confirmado" cuya fechaHora
// ya pasó se corrige aquí a "en_curso", justo antes de responderlo, en vez
// de depender de un proceso en segundo plano. Es una transición de un solo
// sentido — nunca revierte "en_curso" a "confirmado" ni toca ningún otro
// estado (en_proceso, en_curso ya, finalizado, cancelado).
async function actualizarEstadoPorHora(vuelo) {
  if (vuelo.estado === "confirmado" && new Date() >= new Date(vuelo.fechaHora)) {
    vuelo.estado = "en_curso";
    await vuelo.save();
  }
  return vuelo;
}

module.exports = actualizarEstadoPorHora;
