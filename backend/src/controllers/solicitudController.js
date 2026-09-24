const { Op } = require("sequelize");
const { Recurso, Mantenimiento, SolicitudCambio, User } = require("../models");
const { validarDatosAccion, aplicarAccion } = require("../utils/accionesRecurso");

const INCLUDES_SOLICITUD = [
  { model: Recurso },
  { model: User, as: "solicitante", attributes: ["id", "nombre", "correo"] },
  { model: User, as: "revisor", attributes: ["id", "nombre", "correo"] },
];

// GET /api/solicitudes?estado=pendiente (admite varios estados separados por
// coma, ej. ?estado=aprobada,rechazada, usado por el historial).
// El alcance de los resultados depende del rol de quien consulta:
//  - super admin: todas las solicitudes, sin filtro adicional.
//  - administrador regular: solo las que él mismo solicitó.
//  - instructor: las 4 tipoAccion existentes (cambiar_estado,
//    registrar_mantenimiento, finalizar_mantenimiento, actualizar_horas) son
//    todas sobre Recurso/Mantenimiento y solo las genera un administrador —
//    un instructor nunca tiene solicitudes propias, así que ve una lista
//    vacía (no es un error ni un caso pendiente de implementar).
//  - alumno: sin acceso.
async function listarSolicitudes(req, res) {
  try {
    if (req.usuario.rol === "alumno") {
      return res.status(403).json({ mensaje: "No tienes permiso para ver solicitudes." });
    }

    const { estado } = req.query;
    const filtro = {};
    if (estado) {
      const estados = estado.split(",");
      filtro.estado = estados.length > 1 ? { [Op.in]: estados } : estados[0];
    }

    if (req.usuario.rol === "instructor") {
      return res.json({ mensaje: "Solicitudes obtenidas correctamente.", solicitudes: [] });
    }

    if (!req.usuario.esSuperAdmin) {
      filtro.solicitadoPor = req.usuario.id;
    }

    const solicitudes = await SolicitudCambio.findAll({
      where: filtro,
      include: INCLUDES_SOLICITUD,
      order: [["fechaSolicitud", "DESC"]],
    });

    return res.json({ mensaje: "Solicitudes obtenidas correctamente.", solicitudes });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ mensaje: "Error al obtener las solicitudes." });
  }
}

// PUT /api/solicitudes/:id/aprobar (solo super admin, aplica el cambio real)
async function aprobarSolicitud(req, res) {
  try {
    const solicitud = await SolicitudCambio.findByPk(req.params.id);
    if (!solicitud) {
      return res.status(404).json({ mensaje: "Solicitud no encontrada." });
    }

    if (solicitud.estado !== "pendiente") {
      return res.status(409).json({ mensaje: "Esta solicitud ya fue resuelta." });
    }

    const recurso = await Recurso.findByPk(solicitud.recursoId);
    if (!recurso) {
      return res.status(404).json({ mensaje: "El recurso asociado a esta solicitud ya no existe." });
    }

    let mantenimiento = null;
    if (solicitud.tipoAccion === "finalizar_mantenimiento") {
      mantenimiento = await Mantenimiento.findByPk(solicitud.datosPropuestos.mantenimientoId);
    }

    // Se revalida contra el estado actual del recurso: pudo haber cambiado
    // entre el momento en que se creó la solicitud y esta aprobación.
    const validacion = validarDatosAccion(solicitud.tipoAccion, solicitud.datosPropuestos, { recurso, mantenimiento });
    if (!validacion.valido) {
      return res.status(409).json({
        mensaje: `La solicitud ya no se puede aplicar: ${validacion.mensaje}`,
      });
    }

    await aplicarAccion(solicitud.tipoAccion, solicitud.datosPropuestos, { recurso, mantenimiento });

    solicitud.estado = "aprobada";
    solicitud.revisadoPor = req.usuario.id;
    solicitud.fechaResolucion = new Date();
    await solicitud.save();

    return res.json({
      mensaje: "Solicitud aprobada y cambio aplicado correctamente.",
      solicitud,
      recurso: await recurso.reload(),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ mensaje: "Error al aprobar la solicitud." });
  }
}

// PUT /api/solicitudes/:id/rechazar (solo super admin, acepta motivoRechazo)
async function rechazarSolicitud(req, res) {
  try {
    const solicitud = await SolicitudCambio.findByPk(req.params.id);
    if (!solicitud) {
      return res.status(404).json({ mensaje: "Solicitud no encontrada." });
    }

    if (solicitud.estado !== "pendiente") {
      return res.status(409).json({ mensaje: "Esta solicitud ya fue resuelta." });
    }

    const { motivoRechazo } = req.body;

    solicitud.estado = "rechazada";
    solicitud.motivoRechazo = motivoRechazo || null;
    solicitud.revisadoPor = req.usuario.id;
    solicitud.fechaResolucion = new Date();
    await solicitud.save();

    return res.json({ mensaje: "Solicitud rechazada. El recurso no sufrió ningún cambio.", solicitud });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ mensaje: "Error al rechazar la solicitud." });
  }
}

module.exports = { listarSolicitudes, aprobarSolicitud, rechazarSolicitud };
