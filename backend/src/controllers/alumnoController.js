const { ProgresoAlumno, Programa, User } = require("../models");
const calcularPrioridad = require("../utils/calcularPrioridad");

// GET /api/alumnos/lista-prioridad (administrador o super admin)
async function listarPrioridadAlumnos(req, res) {
  try {
    const { ordenarPor = "prioridad" } = req.query;

    const progresos = await ProgresoAlumno.findAll({
      include: [
        { model: Programa },
        { model: User, as: "alumno", attributes: ["id", "nombre", "correo"] },
      ],
    });

    const alumnos = progresos.map((progreso) => ({
      alumnoId: progreso.alumnoId,
      nombre: progreso.alumno?.nombre ?? null,
      correo: progreso.alumno?.correo ?? null,
      programaNombre: progreso.Programa.nombre,
      leccionActual: progreso.leccionActual,
      vueloSoloCompletado: progreso.vueloSoloCompletado,
      prioridadCalculada: calcularPrioridad(progreso.leccionActual, progreso.Programa.nombre),
    }));

    if (ordenarPor === "leccion") {
      alumnos.sort((a, b) => b.leccionActual - a.leccionActual);
    } else if (ordenarPor === "nombre") {
      alumnos.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
    } else {
      // "prioridad" (default): 1 primero (más urgente); empate se resuelve
      // con más lecciones primero dentro del mismo nivel de prioridad.
      alumnos.sort((a, b) => {
        if (a.prioridadCalculada !== b.prioridadCalculada) {
          return a.prioridadCalculada - b.prioridadCalculada;
        }
        return b.leccionActual - a.leccionActual;
      });
    }

    return res.json({ mensaje: "Lista de prioridad obtenida correctamente.", alumnos });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ mensaje: "Error al obtener la lista de prioridad." });
  }
}

module.exports = { listarPrioridadAlumnos };
