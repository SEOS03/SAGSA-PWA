// prioridadCalculada es una herramienta de apoyo para quien programa
// (administrador/super admin, ambos con rol "administrador"); instructor
// y alumno no deben verla en ninguna respuesta que incluya un vuelo.
function serializarVuelo(vuelo, usuario) {
  const datos = vuelo.toJSON ? vuelo.toJSON() : { ...vuelo };

  if (usuario.rol !== "administrador") {
    delete datos.prioridadCalculada;
  }

  return datos;
}

function serializarVuelos(vuelos, usuario) {
  return vuelos.map((vuelo) => serializarVuelo(vuelo, usuario));
}

module.exports = { serializarVuelo, serializarVuelos };
