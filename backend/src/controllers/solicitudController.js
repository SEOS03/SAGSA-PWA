const { Recurso, Mantenimiento, SolicitudCambio, User } = require("../models");
const { validarDatosAccion, aplicarAccion } = require("../utils/accionesRecurso");

const INCLUDES_SOLICITUD = [
  { model: Recurso },
  { model: User, as: "solicitante", attributes: ["id", "nombre", "correo"] },
  { model: User, as: "revisor", attributes: ["id", "nombre", "correo"] },
];

// GET /api/solicitudes?estado=pendiente (solo super admin)
async function listarSolicitudes(req, res) {
  try {
    const { estado } = req.query;
    const filtro = {};
    if (estado) filtro.estado = estado;

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

// GET /api/solicitudes/mias (administrador: ve solo sus propias solicitudes)
async function listarMisSolicitudes(req, res) {
  try {
    const solicitudes = await SolicitudCambio.findAll({
      where: { solicitadoPor: req.usuario.id },
      include: [{ model: Recurso }],
      order: [["fechaSolicitud", "DESC"]],
    });

    return res.json({ mensaje: "Solicitudes obtenidas correctamente.", solicitudes });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ mensaje: "Error al obtener tus solicitudes." });
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

module.exports = { listarSolicitudes, listarMisSolicitudes, aprobarSolicitud, rechazarSolicitud };
