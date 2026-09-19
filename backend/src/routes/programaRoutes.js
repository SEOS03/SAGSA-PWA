const express = require("express");
const router = express.Router();
const { listarProgramas } = require("../controllers/programaController");
const { verificarToken, verificarRol } = require("../middleware/authMiddleware");

router.get("/", verificarToken, verificarRol("administrador"), listarProgramas);

module.exports = router;
