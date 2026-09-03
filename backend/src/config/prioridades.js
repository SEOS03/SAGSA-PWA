// Umbrales de prioridad por programa (Sprint 3 — Módulo de Vuelos).
// Editable aquí sin tocar ningún controlador ni la lógica de negocio.
// Valores PROVISIONALES para piloto_privado (27 lecciones, solo en la 12):
//   1-8   => prioridad 4 (principiante)
//   9-12  => prioridad 2 (próximo al vuelo solo)
//   13-22 => prioridad 3 (ya hizo el solo, aún lejos del chequeo)
//   23-27 => prioridad 1 (próximo al chequeo, la más urgente)
module.exports = {
  piloto_privado: {
    prioridad1_min: 23,
    prioridad2_min: 9,
    prioridad2_max: 12,
    prioridad3_max: 22,
  },
};
