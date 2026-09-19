const { Op, Sequelize } = require("sequelize");
const { sequelize, Vuelo, Recurso, User, ProgresoAlumno, Programa } = require("../models");
const calcularPrioridad = require("../utils/calcularPrioridad");
const { serializarVuelo, serializarVuelos } = require("../utils/serializarVuelo");
const actualizarEstadoPorHora = require("../utils/actualizarEstadoPorHora");

// Datos anidados que necesita el frontend para mostrar un vuelo sin hacer
// lookups adicionales (calendario semanal, Paso 6a). Se restringen los
// attributes de cada include para no exponer más de la cuenta (ej. nunca
// el password del instructor/alumno).
const INCLUDE_DATOS_VUELO = [
  { model: Recurso, as: "recurso", attributes: ["id", "matricula", "tipoRecurso"] },
  { model: User, as: "instructor", attributes: ["id", "nombre"] },
  { model: User, as: "alumno", attributes: ["id", "nombre"] },
];

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

    // Prioridad del alumno en piloto_privado al momento de crear el vuelo.
    // Si no tiene progreso registrado en ese programa, queda sin calcular.
    const progresoPilotoPrivado = await ProgresoAlumno.findOne({
      where: { alumnoId },
      include: [{ model: Programa, where: { nombre: "piloto_privado" } }],
      transaction,
    });

    const prioridadCalculada = progresoPilotoPrivado
      ? calcularPrioridad(progresoPilotoPrivado.leccionActual, "piloto_privado")
      : null;

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
        prioridadCalculada,
        creadoPor: req.usuario.id,
      },
      { transaction }
    );

    await transaction.commit();

    return res.status(201).json({
      mensaje: "Vuelo programado correctamente.",
      vuelo: serializarVuelo(vuelo, req.usuario),
    });
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

    const vuelos = await Vuelo.findAll({
      where: filtro,
      include: INCLUDE_DATOS_VUELO,
      order: [["fechaHora", "ASC"]],
    });
    await Promise.all(vuelos.map((vuelo) => actualizarEstadoPorHora(vuelo)));

    return res.json({
      mensaje: "Vuelos obtenidos correctamente.",
      vuelos: serializarVuelos(vuelos, req.usuario),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ mensaje: "Error al obtener los vuelos." });
  }
}

// GET /api/vuelos/:id (cualquier rol autenticado)
async function obtenerVuelo(req, res) {
  try {
    const vuelo = await Vuelo.findByPk(req.params.id, { include: INCLUDE_DATOS_VUELO });
    if (!vuelo) {
      return res.status(404).json({ mensaje: "Vuelo no encontrado." });
    }
    await actualizarEstadoPorHora(vuelo);

    return res.json({
      mensaje: "Vuelo obtenido correctamente.",
      vuelo: serializarVuelo(vuelo, req.usuario),
    });
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

    return res.json({
      mensaje: "Vuelo cancelado correctamente.",
      vuelo: serializarVuelo(vuelo, req.usuario),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ mensaje: "Error al cancelar el vuelo." });
  }
}

// Lógica compartida por los 3 endpoints de confirmación: busca el vuelo,
// valida permiso, rechaza si ya está resuelto (cancelado/confirmado),
// marca la bandera correspondiente y, si las 3 ya quedan en true, pasa
// el vuelo a "confirmado" en la misma operación.
async function confirmarParte(req, res, { campo, tienePermiso, mensajeSinPermiso, mensajeExito }) {
  try {
    const vuelo = await Vuelo.findByPk(req.params.id);
    if (!vuelo) {
      return res.status(404).json({ mensaje: "Vuelo no encontrado." });
    }

    if (tienePermiso && !tienePermiso(req.usuario, vuelo)) {
      return res.status(403).json({ mensaje: mensajeSinPermiso });
    }

    if (vuelo.estado === "cancelado" || vuelo.estado === "confirmado") {
      return res.status(409).json({
        mensaje: `No se puede confirmar: el vuelo ya está en estado "${vuelo.estado}".`,
      });
    }

    vuelo[campo] = true;

    if (vuelo.confirmacionInstructor && vuelo.confirmacionAlumno && vuelo.aprobacionSuperAdmin) {
      vuelo.estado = "confirmado";
    }

    await vuelo.save();

    return res.json({ mensaje: mensajeExito, vuelo: serializarVuelo(vuelo, req.usuario) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ mensaje: "Error al confirmar el vuelo." });
  }
}

// PATCH /api/vuelos/:id/confirmar-instructor (solo el instructor asignado a ese vuelo)
async function confirmarInstructor(req, res) {
  return confirmarParte(req, res, {
    campo: "confirmacionInstructor",
    tienePermiso: (usuario, vuelo) => Number(usuario.id) === Number(vuelo.instructorId),
    mensajeSinPermiso: "Solo el instructor asignado a este vuelo puede confirmarlo.",
    mensajeExito: "Confirmación del instructor registrada correctamente.",
  });
}

// PATCH /api/vuelos/:id/confirmar-alumno (solo el alumno asignado a ese vuelo)
async function confirmarAlumno(req, res) {
  return confirmarParte(req, res, {
    campo: "confirmacionAlumno",
    tienePermiso: (usuario, vuelo) => Number(usuario.id) === Number(vuelo.alumnoId),
    mensajeSinPermiso: "Solo el alumno asignado a este vuelo puede confirmarlo.",
    mensajeExito: "Confirmación del alumno registrada correctamente.",
  });
}

// PATCH /api/vuelos/:id/aprobar-superadmin
// (permiso de super admin ya exigido por verificarSuperAdmin en la ruta)
async function aprobarSuperAdmin(req, res) {
  return confirmarParte(req, res, {
    campo: "aprobacionSuperAdmin",
    mensajeExito: "Aprobación del super administrador registrada correctamente.",
  });
}

module.exports = {
  crearVuelo,
  listarVuelos,
  obtenerVuelo,
  cancelarVuelo,
  confirmarInstructor,
  confirmarAlumno,
  aprobarSuperAdmin,
};
