const { Programa } = require("../models");

// GET /api/programas (administrador o super admin)
async function listarProgramas(req, res) {
  try {
    const programas = await Programa.findAll({ order: [["nombre", "ASC"]] });
    return res.json({ mensaje: "Programas obtenidos correctamente.", programas });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ mensaje: "Error al obtener los programas." });
  }
}

module.exports = { listarProgramas };
