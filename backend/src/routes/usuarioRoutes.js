const express = require("express");
const router = express.Router();
const {
  crearUsuario,
  buscarPorDpi,
  otorgarPermisoValidarHorometro,
  listarUsuarios,
} = require("../controllers/usuarioController");
const { verificarToken, verificarRol, verificarSuperAdmin } = require("../middleware/authMiddleware");

router.get("/", verificarToken, listarUsuarios);
router.post("/crear", verificarToken, verificarRol("administrador"), crearUsuario);
router.get("/buscar-por-dpi/:dpi", verificarToken, verificarRol("administrador"), buscarPorDpi);
router.patch(
  "/:id/permiso-validar-horometro",
  verificarToken,
  verificarSuperAdmin,
  otorgarPermisoValidarHorometro
);

module.exports = router;
