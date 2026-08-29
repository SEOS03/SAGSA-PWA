const express = require("express");
const router = express.Router();
const { finalizarMantenimiento } = require("../controllers/mantenimientoController");
const { verificarToken, verificarRol } = require("../middleware/authMiddleware");

router.put("/:id/finalizar", verificarToken, verificarRol("administrador"), finalizarMantenimiento);

module.exports = router;
