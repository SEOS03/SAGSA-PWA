const { Recurso, Mantenimiento, SolicitudCambio } = require("../models");
const { validarDatosAccion, aplicarAccion } = require("../utils/accionesRecurso");

const TIPOS_RECURSO = ["ala_fija", "ala_rotativa", "simulador"];

// POST /api/recursos (solo super admin)
async function crearRecurso(req, res) {
  try {
    const { matricula, modelo, tipoRecurso, horasParaMantenimiento } = req.body;

    if (!matricula || !tipoRecurso) {
      return res.status(400).json({ mensaje: "La matrícula y el tipo de recurso son obligatorios." });
    }

    if (!TIPOS_RECURSO.includes(tipoRecurso)) {
      return res.status(400).json({ mensaje: "El tipo de recurso debe ser ala_fija, ala_rotativa o simulador." });
    }

    const existente = await Recurso.findOne({ where: { matricula } });
    if (existente) {
      return res.status(409).json({ mensaje: "Ya existe un recurso registrado con esa matrícula." });
    }

    const nuevoRecurso = await Recurso.create({
      matricula,
      modelo: modelo || null,
      tipoRecurso,
      horasParaMantenimiento: horasParaMantenimiento ?? null,
    });

    return res.status(201).json({ mensaje: "Recurso creado correctamente.", recurso: nuevoRecurso });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ mensaje: "Error al crear el recurso." });
  }
}

// GET /api/recursos (cualquier rol autenticado)
async function listarRecursos(req, res) {
  try {
    const { tipoRecurso } = req.query;
    const filtro = { activo: true };
    if (tipoRecurso) filtro.tipoRecurso = tipoRecurso;

    const recursos = await Recurso.findAll({ where: filtro, order: [["matricula", "ASC"]] });
    return res.json({ mensaje: "Recursos obtenidos correctamente.", recursos });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ mensaje: "Error al obtener los recursos." });
  }
}

// GET /api/recursos/:id (cualquier rol autenticado)
async function obtenerRecurso(req, res) {
  try {
    const recurso = await Recurso.findByPk(req.params.id);
    if (!recurso) {
      return res.status(404).json({ mensaje: "Recurso no encontrado." });
    }
    return res.json({ mensaje: "Recurso obtenido correctamente.", recurso });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ mensaje: "Error al obtener el recurso." });
  }
}

// PUT /api/recursos/:id (solo super admin)
async function actualizarRecurso(req, res) {
  try {
    const recurso = await Recurso.findByPk(req.params.id);
    if (!recurso) {
      return res.status(404).json({ mensaje: "Recurso no encontrado." });
    }

    const { matricula, modelo, tipoRecurso, horasParaMantenimiento } = req.body;

    if (tipoRecurso && !TIPOS_RECURSO.includes(tipoRecurso)) {
      return res.status(400).json({ mensaje: "El tipo de recurso debe ser ala_fija, ala_rotativa o simulador." });
    }

    if (matricula && matricula !== recurso.matricula) {
      const existente = await Recurso.findOne({ where: { matricula } });
      if (existente) {
        return res.status(409).json({ mensaje: "Ya existe un recurso registrado con esa matrícula." });
      }
      recurso.matricula = matricula;
    }

    if (modelo !== undefined) recurso.modelo = modelo;
    if (tipoRecurso) recurso.tipoRecurso = tipoRecurso;
    if (horasParaMantenimiento !== undefined) recurso.horasParaMantenimiento = horasParaMantenimiento;

    await recurso.save();

    return res.json({ mensaje: "Recurso actualizado correctamente.", recurso });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ mensaje: "Error al actualizar el recurso." });
  }
}

// DELETE /api/recursos/:id (solo super admin, baja lógica)
async function darDeBajaRecurso(req, res) {
  try {
    const recurso = await Recurso.findByPk(req.params.id);
    if (!recurso) {
      return res.status(404).json({ mensaje: "Recurso no encontrado." });
    }

    recurso.activo = false;
    await recurso.save();

    return res.json({ mensaje: "Recurso dado de baja correctamente.", recurso });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ mensaje: "Error al dar de baja el recurso." });
  }
}

// Punto único usado por las acciones "cambiar_estado", "registrar_mantenimiento"
// y "actualizar_horas": valida la acción y, según el rol de quien la invoca,
// la aplica de inmediato (super admin) o crea una solicitud pendiente (admin regular).
async function ejecutarOEnviarSolicitud(req, res, { tipoAccion, recurso, datosPropuestos, mensajeExito }) {
  const validacion = validarDatosAccion(tipoAccion, datosPropuestos, { recurso });
  if (!validacion.valido) {
    return res.status(400).json({ mensaje: validacion.mensaje });
  }

  if (req.usuario.esSuperAdmin) {
    const resultado = await aplicarAccion(tipoAccion, datosPropuestos, { recurso });
    return res.json({ mensaje: mensajeExito, recurso: await recurso.reload(), resultado });
  }

  const solicitud = await SolicitudCambio.create({
    recursoId: recurso.id,
    tipoAccion,
    datosPropuestos,
    solicitadoPor: req.usuario.id,
  });

  return res.status(202).json({
    mensaje: "Solicitud enviada, pendiente de aprobación del super administrador.",
    solicitud,
  });
}

// PATCH /api/recursos/:id/estado (admin vía solicitud, super admin directo)
async function cambiarEstado(req, res) {
  try {
    const recurso = await Recurso.findByPk(req.params.id);
    if (!recurso) {
      return res.status(404).json({ mensaje: "Recurso no encontrado." });
    }

    const { estado } = req.body;
    if (!estado) {
      return res.status(400).json({ mensaje: "El nuevo estado es obligatorio." });
    }

    return await ejecutarOEnviarSolicitud(req, res, {
      tipoAccion: "cambiar_estado",
      recurso,
      datosPropuestos: { estado },
      mensajeExito: "Estado del recurso actualizado correctamente.",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ mensaje: "Error al cambiar el estado del recurso." });
  }
}

// PATCH /api/recursos/:id/horas (admin vía solicitud, super admin directo)
async function actualizarHoras(req, res) {
  try {
    const recurso = await Recurso.findByPk(req.params.id);
    if (!recurso) {
      return res.status(404).json({ mensaje: "Recurso no encontrado." });
    }

    const { horasAcumuladas } = req.body;

    return await ejecutarOEnviarSolicitud(req, res, {
      tipoAccion: "actualizar_horas",
      recurso,
      datosPropuestos: { horasAcumuladas },
      mensajeExito: "Horas acumuladas actualizadas correctamente.",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ mensaje: "Error al actualizar las horas del recurso." });
  }
}

// POST /api/recursos/:id/mantenimientos (admin vía solicitud, super admin directo)
async function registrarMantenimiento(req, res) {
  try {
    const recurso = await Recurso.findByPk(req.params.id);
    if (!recurso) {
      return res.status(404).json({ mensaje: "Recurso no encontrado." });
    }

    const { tipoMantenimiento, fechaInicio, horasAlIngreso, descripcion } = req.body;

    return await ejecutarOEnviarSolicitud(req, res, {
      tipoAccion: "registrar_mantenimiento",
      recurso,
      datosPropuestos: {
        tipoMantenimiento,
        fechaInicio: fechaInicio || new Date().toISOString(),
        horasAlIngreso: horasAlIngreso ?? null,
        descripcion: descripcion || null,
      },
      mensajeExito: "Mantenimiento registrado correctamente. El recurso pasó a estado en_mantenimiento.",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ mensaje: "Error al registrar el mantenimiento." });
  }
}

// GET /api/recursos/:id/mantenimientos (cualquier rol autenticado)
async function listarMantenimientos(req, res) {
  try {
    const recurso = await Recurso.findByPk(req.params.id);
    if (!recurso) {
      return res.status(404).json({ mensaje: "Recurso no encontrado." });
    }

    const mantenimientos = await Mantenimiento.findAll({
      where: { recursoId: recurso.id },
      order: [["fechaInicio", "DESC"]],
    });

    return res.json({ mensaje: "Mantenimientos obtenidos correctamente.", mantenimientos });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ mensaje: "Error al obtener los mantenimientos del recurso." });
  }
}

module.exports = {
  crearRecurso,
  listarRecursos,
  obtenerRecurso,
  actualizarRecurso,
  darDeBajaRecurso,
  cambiarEstado,
  actualizarHoras,
  registrarMantenimiento,
  listarMantenimientos,
  ejecutarOEnviarSolicitud,
};
