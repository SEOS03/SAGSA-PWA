const { Op, Sequelize } = require("sequelize");
const { sequelize, Vuelo, Recurso, User } = require("../models");

const MOTIVOS_CANCELACION = [
  "cancelado_por_alumno",
  "cancelado_por_instructor",
  "cancelado_por_mantenimiento_aeronave",
  "cancelado_por_clima",
  "otro",
];

// POST /api/vuelos (cualquier rol autenticado)
async function crearVuelo(req, res) {
  const { recursoId, instructorId, alumnoId, fechaHora, duracionMinutos, leccionProgramada } = req.body;

  if (!recursoId || !instructorId || !alumnoId || !fechaHora || !duracionMinutos) {
    return res.status(400).json({
      mensaje: "recursoId, instructorId, alumnoId, fechaHora y duracionMinutos son obligatorios.",
    });
  }

  const inicio = new Date(fechaHora);
  if (Number.isNaN(inicio.getTime())) {
    return res.status(400).json({ mensaje: "fechaHora no es una fecha válida." });
  }

  const duracion = Number(duracionMinutos);
  if (!Number.isInteger(duracion) || duracion <= 0) {
    return res.status(400).json({ mensaje: "duracionMinutos debe ser un número entero positivo." });
  }

  const fin = new Date(inicio.getTime() + duracion * 60000);

  const transaction = await sequelize.transaction();

  try {
    // Bloquea la fila del recurso: cualquier otra solicitud que involucre
    // este mismo recurso espera a que esta transacción termine, evitando
    // que dos vuelos simultáneos se programen en el mismo horario.
    const recurso = await Recurso.findByPk(recursoId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!recurso) {
      await transaction.rollback();
      return res.status(404).json({ mensaje: "El recurso indicado no existe." });
    }

    const [instructor, alumno] = await Promise.all([
      User.findByPk(instructorId, { transaction }),
      User.findByPk(alumnoId, { transaction }),
    ]);

    if (!instructor) {
      await transaction.rollback();
      return res.status(404).json({ mensaje: "El instructor indicado no existe." });
    }
    if (!alumno) {
      await transaction.rollback();
      return res.status(404).json({ mensaje: "El alumno indicado no existe." });
    }

    // Solapamiento: existe otro vuelo no cancelado que comparte recurso,
    // instructor o alumno, y cuyo rango [fechaHora, fechaHora+duracion)
    // se cruza con el rango solicitado.
    const vueloConflicto = await Vuelo.findOne({
      where: Sequelize.and(
        { estado: { [Op.ne]: "cancelado" } },
        Sequelize.or({ recursoId }, { instructorId }, { alumnoId }),
        { fechaHora: { [Op.lt]: fin } },
        Sequelize.where(
          Sequelize.fn("DATE_ADD", Sequelize.col("fechaHora"), Sequelize.literal("INTERVAL duracionMinutos MINUTE")),
          { [Op.gt]: inicio }
        )
      ),
      transaction,
    });

    if (vueloConflicto) {
      const razones = [];
      if (Number(vueloConflicto.recursoId) === Number(recursoId)) {
        razones.push("el recurso ya tiene otro vuelo programado en ese horario");
      }
      if (Number(vueloConflicto.instructorId) === Number(instructorId)) {
        razones.push("el instructor ya tiene otro vuelo programado en ese horario");
      }
      if (Number(vueloConflicto.alumnoId) === Number(alumnoId)) {
        razones.push("el alumno ya tiene otro vuelo programado en ese horario");
      }

      await transaction.rollback();
      return res.status(409).json({
        mensaje: `No se pudo programar el vuelo: ${razones.join("; ")}.`,
      });
    }

    // Quien crea el vuelo queda auto-confirmado en su propio rol, si le
    // corresponde ese rol asignado en el vuelo. El admin regular no
    // autoconfirma nada: las 3 quedan pendientes de los endpoints del Paso 4.
    let confirmacionInstructor = false;
    let confirmacionAlumno = false;
    let aprobacionSuperAdmin = false;

    if (req.usuario.esSuperAdmin) {
      aprobacionSuperAdmin = true;
    }
    if (req.usuario.rol === "instructor" && Number(req.usuario.id) === Number(instructorId)) {
      confirmacionInstructor = true;
    }
    if (req.usuario.rol === "alumno" && Number(req.usuario.id) === Number(alumnoId)) {
      confirmacionAlumno = true;
    }

    const estado =
      confirmacionInstructor && confirmacionAlumno && aprobacionSuperAdmin ? "confirmado" : "en_proceso";

    const vuelo = await Vuelo.create(
      {
        recursoId,
        instructorId,
        alumnoId,
        fechaHora: inicio,
        duracionMinutos: duracion,
        leccionProgramada: leccionProgramada ?? null,
        estado,
        confirmacionInstructor,
        confirmacionAlumno,
        aprobacionSuperAdmin,
        creadoPor: req.usuario.id,
      },
      { transaction }
    );

    await transaction.commit();

    return res.status(201).json({ mensaje: "Vuelo programado correctamente.", vuelo });
  } catch (error) {
    await transaction.rollback();
    console.error(error);
    return res.status(500).json({ mensaje: "Error al programar el vuelo." });
  }
}

// GET /api/vuelos (cualquier rol autenticado)
async function listarVuelos(req, res) {
  try {
    const { recursoId, instructorId, alumnoId, estado, desde, hasta } = req.query;
    const filtro = {};

    if (recursoId) filtro.recursoId = recursoId;
    if (instructorId) filtro.instructorId = instructorId;
    if (alumnoId) filtro.alumnoId = alumnoId;
    if (estado) filtro.estado = estado;

    if (desde || hasta) {
      filtro.fechaHora = {};
      if (desde) filtro.fechaHora[Op.gte] = new Date(desde);
      if (hasta) filtro.fechaHora[Op.lte] = new Date(hasta);
    }

    const vuelos = await Vuelo.findAll({ where: filtro, order: [["fechaHora", "ASC"]] });
    return res.json({ mensaje: "Vuelos obtenidos correctamente.", vuelos });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ mensaje: "Error al obtener los vuelos." });
  }
}

// GET /api/vuelos/:id (cualquier rol autenticado)
async function obtenerVuelo(req, res) {
  try {
    const vuelo = await Vuelo.findByPk(req.params.id);
    if (!vuelo) {
      return res.status(404).json({ mensaje: "Vuelo no encontrado." });
    }
    return res.json({ mensaje: "Vuelo obtenido correctamente.", vuelo });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ mensaje: "Error al obtener el vuelo." });
  }
}

// PATCH /api/vuelos/:id/cancelar (administrador/super admin, o el
// instructor/alumno asignado a ese vuelo específico)
async function cancelarVuelo(req, res) {
  try {
    const vuelo = await Vuelo.findByPk(req.params.id);
    if (!vuelo) {
      return res.status(404).json({ mensaje: "Vuelo no encontrado." });
    }

    const { motivoCancelacion } = req.body;
    if (!motivoCancelacion || !MOTIVOS_CANCELACION.includes(motivoCancelacion)) {
      return res.status(400).json({
        mensaje: `motivoCancelacion es obligatorio y debe ser uno de: ${MOTIVOS_CANCELACION.join(", ")}.`,
      });
    }

    const { id: usuarioId, rol } = req.usuario;
    const esAsignado =
      Number(usuarioId) === Number(vuelo.instructorId) || Number(usuarioId) === Number(vuelo.alumnoId);

    if (rol !== "administrador" && !esAsignado) {
      return res.status(403).json({ mensaje: "No tiene permisos para cancelar este vuelo." });
    }

    vuelo.estado = "cancelado";
    vuelo.motivoCancelacion = motivoCancelacion;
    vuelo.canceladoPor = usuarioId;
    await vuelo.save();

    return res.json({ mensaje: "Vuelo cancelado correctamente.", vuelo });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ mensaje: "Error al cancelar el vuelo." });
  }
}

module.exports = { crearVuelo, listarVuelos, obtenerVuelo, cancelarVuelo };
