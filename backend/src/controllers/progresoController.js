const { Op } = require("sequelize");
const { ProgresoAlumno, Programa, User } = require("../models");

const ESTADOS_ACTIVOS = ["en_curso", "pendiente_chequeo"];

// POST /api/progreso (administrador o super admin)
async function inscribirAlumno(req, res) {
  try {
    const { alumnoId, programaId, instructorAsignadoId } = req.body;

    if (!alumnoId || !programaId) {
      return res.status(400).json({ mensaje: "alumnoId y programaId son obligatorios." });
    }

    const alumno = await User.findByPk(alumnoId);
    if (!alumno || alumno.rol !== "alumno") {
      return res.status(400).json({ mensaje: "alumnoId debe corresponder a un usuario con rol alumno." });
    }

    const programa = await Programa.findByPk(programaId);
    if (!programa) {
      return res.status(400).json({ mensaje: "El programa indicado no existe." });
    }

    if (instructorAsignadoId) {
      const instructor = await User.findByPk(instructorAsignadoId);
      if (!instructor || instructor.rol !== "instructor") {
        return res
          .status(400)
          .json({ mensaje: "instructorAsignadoId debe corresponder a un usuario con rol instructor." });
      }
    }

    // Un alumno puede tener inscripciones activas en programas distintos a
    // la vez; lo que no se permite es duplicar una inscripción activa en el
    // MISMO programa (sí puede reinscribirse ahí una vez la anterior esté
    // "completado").
    const inscripcionActiva = await ProgresoAlumno.findOne({
      where: { alumnoId, programaId, estadoPrograma: { [Op.in]: ESTADOS_ACTIVOS } },
    });

    if (inscripcionActiva) {
      return res.status(409).json({ mensaje: "Este alumno ya tiene una inscripción activa en este programa." });
    }

    const progreso = await ProgresoAlumno.create({
      alumnoId,
      programaId,
      instructorAsignadoId: instructorAsignadoId || null,
      leccionActual: 0,
      vueloSoloCompletado: false,
      horasSimuladorAcumuladas: 0,
      horasAvionAcumuladas: 0,
      estadoPrograma: "en_curso",
      fechaInicio: new Date(),
    });

    return res.status(201).json({ mensaje: "Alumno inscrito correctamente.", progreso });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ mensaje: "Error al inscribir al alumno." });
  }
}

// PATCH /api/progreso/:id/instructor (administrador o super admin)
async function reasignarInstructor(req, res) {
  try {
    const { instructorAsignadoId } = req.body;

    if (!instructorAsignadoId) {
      return res.status(400).json({ mensaje: "instructorAsignadoId es obligatorio." });
    }

    const instructor = await User.findByPk(instructorAsignadoId);
    if (!instructor || instructor.rol !== "instructor") {
      return res
        .status(400)
        .json({ mensaje: "instructorAsignadoId debe corresponder a un usuario con rol instructor." });
    }

    const progreso = await ProgresoAlumno.findByPk(req.params.id);
    if (!progreso) {
      return res.status(404).json({ mensaje: "Registro de progreso no encontrado." });
    }

    // Sin validación contra el instructor anterior: el cambio se permite en
    // cualquier momento, sin justificación ni historial.
    progreso.instructorAsignadoId = instructorAsignadoId;
    await progreso.save();

    return res.json({ mensaje: "Instructor reasignado correctamente.", progreso });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ mensaje: "Error al reasignar el instructor." });
  }
}

// GET /api/progreso?alumnoId= (administrador o super admin; usado para
// mostrar las inscripciones activas de un alumno específico y poder
// reasignarle instructor desde el buscador de usuarios)
async function listarProgresoPorAlumno(req, res) {
  try {
    const { alumnoId } = req.query;

    if (!alumnoId) {
      return res.status(400).json({ mensaje: "alumnoId es obligatorio." });
    }

    const progresos = await ProgresoAlumno.findAll({
      where: { alumnoId, estadoPrograma: { [Op.in]: ESTADOS_ACTIVOS } },
      include: [{ model: Programa }, { model: User, as: "instructorAsignado", attributes: ["id", "nombre"] }],
      order: [["fechaInicio", "DESC"]],
    });

    return res.json({ mensaje: "Inscripciones obtenidas correctamente.", progresos });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ mensaje: "Error al obtener las inscripciones del alumno." });
  }
}

// GET /api/progreso/mio (solo alumno; nunca incluye prioridadCalculada,
// ese dato es exclusivo de administración en todo el sistema)
async function obtenerMiProgreso(req, res) {
  try {
    const progresos = await ProgresoAlumno.findAll({
      where: { alumnoId: req.usuario.id },
      include: [{ model: Programa }, { model: User, as: "instructorAsignado", attributes: ["id", "nombre"] }],
      order: [["fechaInicio", "DESC"]],
    });

    return res.json({ mensaje: "Progreso obtenido correctamente.", progresos });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ mensaje: "Error al obtener el progreso." });
  }
}

// GET /api/progreso/mis-alumnos (solo instructor; tampoco incluye
// prioridadCalculada)
async function obtenerMisAlumnos(req, res) {
  try {
    const progresos = await ProgresoAlumno.findAll({
      where: { instructorAsignadoId: req.usuario.id },
      include: [{ model: Programa }, { model: User, as: "alumno", attributes: ["id", "nombre", "correo"] }],
      order: [["fechaInicio", "DESC"]],
    });

    return res.json({ mensaje: "Alumnos asignados obtenidos correctamente.", progresos });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ mensaje: "Error al obtener los alumnos asignados." });
  }
}

module.exports = {
  inscribirAlumno,
  reasignarInstructor,
  listarProgresoPorAlumno,
  obtenerMiProgreso,
  obtenerMisAlumnos,
};
