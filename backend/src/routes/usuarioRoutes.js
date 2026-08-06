const express = require("express");
const router = express.Router();
const { crearUsuario } = require("../controllers/usuarioController");
const { verificarToken, verificarRol } = require("../middleware/authMiddleware");

router.post("/crear", verificarToken, verificarRol("administrador"), crearUsuario);

module.exports = router;
