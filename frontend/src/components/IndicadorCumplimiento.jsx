// Indicador de cumplimiento RAC-141 (horas mínimas) de una inscripción. Solo
// muestra lo que ya calculó el backend en progreso.cumplimiento; no recalcula
// nada por su cuenta.
function formatearHoras(horas) {
  return `${Number(horas)} h`;
}

export default function IndicadorCumplimiento({ cumplimiento }) {
  if (!cumplimiento) return null;

  const { cumpleTotal, cumpleSimulador, cumpleAvion, horasFaltantesSimulador, horasFaltantesAvion } = cumplimiento;

  if (cumpleTotal) {
    return <span className="estado-badge estado-badge--cumple">Cumple RAC-141</span>;
  }

  let texto;
  if (!cumpleSimulador && !cumpleAvion) {
    texto = `Faltan ${formatearHoras(horasFaltantesSimulador)} de simulador y ${formatearHoras(horasFaltantesAvion)} de avión`;
  } else if (!cumpleSimulador) {
    texto = `Falta simulador: ${formatearHoras(horasFaltantesSimulador)}`;
  } else {
    texto = `Falta avión: ${formatearHoras(horasFaltantesAvion)}`;
  }

  return (
    <span className="estado-badge estado-badge--pendiente-rac" title="Pendiente de cumplir horas mínimas RAC-141">
      Pendiente · {texto}
    </span>
  );
}
