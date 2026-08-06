const express = require("express");
const router = express.Router();
const { registrar, iniciarSesion, obtenerPerfil } = require("../controllers/authController");
const { verificarToken } = require("../middleware/authMiddleware");

router.post("/registro", registrar);
router.post("/login", iniciarSesion);
router.get("/perfil", verificarToken, obtenerPerfil); // ruta protegida, para probar el token

module.exports = router;
