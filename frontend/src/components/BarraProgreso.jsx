export default function BarraProgreso({ porcentaje }) {
  const valor = Math.max(0, Math.min(100, Math.round(porcentaje)));

  return (
    <div className="barra-progreso" role="progressbar" aria-valuenow={valor} aria-valuemin={0} aria-valuemax={100}>
      <div className="barra-progreso__relleno" style={{ width: `${valor}%` }} />
      <span className="barra-progreso__texto">{valor}%</span>
    </div>
  );
}
