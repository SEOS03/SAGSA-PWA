// Porcentaje total de avance de una inscripción: horas acumuladas
// (simulador + avión) sobre el total requerido por su programa. Nunca pasa
// de 100 aunque las horas acumuladas superen el total del programa.
export function calcularProgreso(progreso) {
  const totalHoras =
    Number(progreso.Programa?.horasSimuladorTotal || 0) + Number(progreso.Programa?.horasAvionTotal || 0);
  if (totalHoras <= 0) return 0;

  const horasAcumuladas = Number(progreso.horasSimuladorAcumuladas || 0) + Number(progreso.horasAvionAcumuladas || 0);
  return Math.min(100, Math.round((horasAcumuladas / totalHoras) * 100));
}
