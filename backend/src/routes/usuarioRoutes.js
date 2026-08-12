const express = require("express");
const router = express.Router();
const { crearUsuario, buscarPorDpi } = require("../controllers/usuarioController");
const { verificarToken, verificarRol } = require("../middleware/authMiddleware");

router.post("/crear", verificarToken, verificarRol("administrador"), crearUsuario);
router.get("/buscar-por-dpi/:dpi", verificarToken, verificarRol("administrador"), buscarPorDpi);

module.exports = router;
