const UMBRALES = require("../config/prioridades");

// Prioridad 1 = más urgente de programar, 4 = menos urgente.
// Solo piloto_privado tiene niveles definidos por ahora; cualquier otro
// programa (o uno sin umbrales configurados) devuelve un valor neutral (3).
function calcularPrioridad(leccionActual, nombrePrograma) {
  const umbrales = UMBRALES[nombrePrograma];

  if (!umbrales) {
    return 3;
  }

  const leccion = Number(leccionActual);

  if (leccion >= umbrales.prioridad1_min) {
    return 1;
  }
  if (leccion >= umbrales.prioridad2_min && leccion <= umbrales.prioridad2_max) {
    return 2;
  }
  if (leccion > umbrales.prioridad2_max && leccion <= umbrales.prioridad3_max) {
    return 3;
  }
  return 4;
}

module.exports = calcularPrioridad;
