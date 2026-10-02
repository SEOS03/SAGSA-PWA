// Progreso y cumplimiento RAC-141 (horas mínimas) de una inscripción.
// Recibe un ProgresoAlumno con su Programa incluido. Se calcula una sola vez
// aquí y se adjunta a las respuestas de la API para que el frontend no tenga
// que recalcular nada por su cuenta.

function redondear(valor) {
  return Math.round(valor * 100) / 100;
}

function porcentaje(acumuladas, total) {
  if (total <= 0) return 100;
  return Math.min(100, Math.round((acumuladas / total) * 100));
}

function calcularProgreso(progreso) {
  const horasSimuladorTotal = Number(progreso.Programa?.horasSimuladorTotal || 0);
  const horasAvionTotal = Number(progreso.Programa?.horasAvionTotal || 0);
  const horasSimuladorAcumuladas = Number(progreso.horasSimuladorAcumuladas || 0);
  const horasAvionAcumuladas = Number(progreso.horasAvionAcumuladas || 0);

  // Porcentaje total: horas combinadas sobre el total combinado del programa
  // (mismo criterio que la barra de progreso existente). Nunca pasa de 100.
  const totalHoras = horasSimuladorTotal + horasAvionTotal;
  const pctTotal =
    totalHoras > 0
      ? Math.min(100, Math.round(((horasSimuladorAcumuladas + horasAvionAcumuladas) / totalHoras) * 100))
      : 0;

  const cumpleSimulador = horasSimuladorAcumuladas >= horasSimuladorTotal;
  const cumpleAvion = horasAvionAcumuladas >= horasAvionTotal;

  return {
    pctSimulador: porcentaje(horasSimuladorAcumuladas, horasSimuladorTotal),
    pctAvion: porcentaje(horasAvionAcumuladas, horasAvionTotal),
    pctTotal,
    cumpleSimulador,
    cumpleAvion,
    // Un alumno NO cumple solo por tener el total combinado de horas: le
    // tienen que alcanzar las de cada tipo por separado.
    cumpleTotal: cumpleSimulador && cumpleAvion,
    horasFaltantesSimulador: redondear(Math.max(0, horasSimuladorTotal - horasSimuladorAcumuladas)),
    horasFaltantesAvion: redondear(Math.max(0, horasAvionTotal - horasAvionAcumuladas)),
  };
}

// Serializa una inscripción (instancia de Sequelize) agregándole el campo
// "cumplimiento" con el resultado de calcularProgreso.
function conCumplimiento(progreso) {
  return { ...progreso.toJSON(), cumplimiento: calcularProgreso(progreso) };
}

module.exports = calcularProgreso;
module.exports.conCumplimiento = conCumplimiento;
