// Utilidades de fechas para el calendario semanal (lunes a domingo).

export function obtenerLunes(fecha) {
  const d = new Date(fecha);
  const dia = d.getDay(); // 0=domingo, 1=lunes, ... 6=sábado
  const diferencia = dia === 0 ? -6 : 1 - dia;
  d.setDate(d.getDate() + diferencia);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function sumarDias(fecha, cantidad) {
  const d = new Date(fecha);
  d.setDate(d.getDate() + cantidad);
  return d;
}

export function obtenerDiasSemana(lunes) {
  return Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));
}

export function mismoDia(fechaA, fechaB) {
  return (
    fechaA.getFullYear() === fechaB.getFullYear() &&
    fechaA.getMonth() === fechaB.getMonth() &&
    fechaA.getDate() === fechaB.getDate()
  );
}

export function esFechaPasada(fecha) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const comparar = new Date(fecha);
  comparar.setHours(0, 0, 0, 0);
  return comparar < hoy;
}

export function formatoDiaCorto(fecha) {
  const texto = new Intl.DateTimeFormat("es-GT", { weekday: "short", day: "numeric" }).format(fecha);
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function formatoRangoSemana(lunes) {
  const domingo = sumarDias(lunes, 6);
  const mismoMes = lunes.getMonth() === domingo.getMonth();
  const opcionesCorta = { day: "numeric" };
  const opcionesLarga = { day: "numeric", month: "long", year: "numeric" };

  const inicio = new Intl.DateTimeFormat("es-GT", mismoMes ? opcionesCorta : opcionesLarga).format(lunes);
  const fin = new Intl.DateTimeFormat("es-GT", opcionesLarga).format(domingo);

  return `${inicio} – ${fin}`;
}
