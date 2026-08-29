const { Recurso, Mantenimiento, SolicitudCambio } = require("../models");
const { validarDatosAccion, aplicarAccion } = require("../utils/accionesRecurso");

// PUT /api/mantenimientos/:id/finalizar (admin vía solicitud, super admin directo)
async function finalizarMantenimiento(req, res) {
  try {
    const mantenimiento = await Mantenimiento.findByPk(req.params.id);
    if (!mantenimiento) {
      return res.status(404).json({ mensaje: "Mantenimiento no encontrado." });
    }

    const recurso = await Recurso.findByPk(mantenimiento.recursoId);
    if (!recurso) {
      return res.status(404).json({ mensaje: "Recurso no encontrado." });
    }

    const { fechaFin, horasActuales } = req.body;
    const datosPropuestos = {
      mantenimientoId: mantenimiento.id,
      fechaFin: fechaFin || new Date().toISOString(),
      horasActuales: horasActuales ?? null,
    };

    const validacion = validarDatosAccion("finalizar_mantenimiento", datosPropuestos, { recurso, mantenimiento });
    if (!validacion.valido) {
      return res.status(400).json({ mensaje: validacion.mensaje });
    }

    if (req.usuario.esSuperAdmin) {
      await aplicarAccion("finalizar_mantenimiento", datosPropuestos, { recurso, mantenimiento });
      return res.json({
        mensaje: "Mantenimiento finalizado correctamente. El recurso volvió a estado disponible.",
        mantenimiento,
        recurso: await recurso.reload(),
      });
    }

    const solicitud = await SolicitudCambio.create({
      recursoId: recurso.id,
      tipoAccion: "finalizar_mantenimiento",
      datosPropuestos,
      solicitadoPor: req.usuario.id,
    });

    return res.status(202).json({
      mensaje: "Solicitud enviada, pendiente de aprobación del super administrador.",
      solicitud,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ mensaje: "Error al finalizar el mantenimiento." });
  }
}

module.exports = { finalizarMantenimiento };
