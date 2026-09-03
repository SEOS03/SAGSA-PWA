const express = require("express");
const router = express.Router();
const { listarPrioridadAlumnos } = require("../controllers/alumnoController");
const { verificarToken, verificarRol } = require("../middleware/authMiddleware");

router.get("/lista-prioridad", verificarToken, verificarRol("administrador"), listarPrioridadAlumnos);

module.exports = router;
