const express = require("express");
const router = express.Router();
const {
  iniciarSesion,
  obtenerPerfil,
  cambiarPassword,
  solicitarRecuperacion,
  restablecerPassword,
} = require("../controllers/authController");
const { verificarToken } = require("../middleware/authMiddleware");

router.post("/login", iniciarSesion);
router.get("/perfil", verificarToken, obtenerPerfil); // ruta protegida, para probar el token
router.post("/cambiar-password", verificarToken, cambiarPassword);
router.post("/solicitar-recuperacion", solicitarRecuperacion);
router.post("/restablecer-password", restablecerPassword);

module.exports = router;
