// Indicador de cumplimiento RAC-141 (horas mínimas) de una inscripción. Solo
// muestra lo que ya calculó el backend en progreso.cumplimiento; no recalcula
// nada por su cuenta.
//
// - compacto = false (tarjetas de Mi Progreso / Mis Alumnos): frase completa
//   en una sola etiqueta ("Pendiente · Falta simulador: 6 h").
// - compacto = true (tabla de Progreso de alumnos): dos líneas apiladas,
//   estado arriba y horas faltantes abreviadas abajo ("-6h sim, -7h avión").
function formatearHoras(horas) {
  return `${Number(horas)} h`;
}

// Redondea hacia arriba a un decimal para que un pendiente nunca se muestre
// como "-0h" (ej. 0.04 h faltantes → "-0.1h").
function formatearHorasCorto(horas) {
  return `-${Math.ceil(Number(horas) * 10) / 10}h`;
}

export default function IndicadorCumplimiento({ cumplimiento, compacto = false }) {
  if (!cumplimiento) return null;

  const { cumpleTotal, cumpleSimulador, cumpleAvion, horasFaltantesSimulador, horasFaltantesAvion } = cumplimiento;

  let texto = null;
  if (!cumpleSimulador && !cumpleAvion) {
    texto = `Faltan ${formatearHoras(horasFaltantesSimulador)} de simulador y ${formatearHoras(horasFaltantesAvion)} de avión`;
  } else if (!cumpleSimulador) {
    texto = `Falta simulador: ${formatearHoras(horasFaltantesSimulador)}`;
  } else if (!cumpleAvion) {
    texto = `Falta avión: ${formatearHoras(horasFaltantesAvion)}`;
  }

  if (compacto) {
    if (cumpleTotal) {
      return (
        <span className="estado-badge estado-badge--cumple estado-badge--compacto" title="Cumple horas mínimas RAC-141">
          <span className="estado-badge__estado">Cumple</span>
        </span>
      );
    }

    const faltantes = [];
    if (!cumpleSimulador) faltantes.push(`${formatearHorasCorto(horasFaltantesSimulador)} sim`);
    if (!cumpleAvion) faltantes.push(`${formatearHorasCorto(horasFaltantesAvion)} avión`);

    return (
      <span className="estado-badge estado-badge--pendiente-rac estado-badge--compacto" title={`Pendiente · ${texto}`}>
        <span className="estado-badge__estado">Pendiente</span>
        <span className="estado-badge__detalle">
          {faltantes.map((f, i) => (
            <span key={f}>
              {i > 0 && ", "}
              <span className="estado-badge__detalle-parte">{f}</span>
            </span>
          ))}
        </span>
      </span>
    );
  }

  if (cumpleTotal) {
    return <span className="estado-badge estado-badge--cumple">Cumple RAC-141</span>;
  }

  return (
    <span className="estado-badge estado-badge--pendiente-rac" title="Pendiente de cumplir horas mínimas RAC-141">
      Pendiente · {texto}
    </span>
  );
}
