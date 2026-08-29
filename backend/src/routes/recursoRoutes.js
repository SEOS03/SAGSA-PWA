const express = require("express");
const router = express.Router();
const {
  crearRecurso,
  listarRecursos,
  obtenerRecurso,
  actualizarRecurso,
  darDeBajaRecurso,
  cambiarEstado,
  actualizarHoras,
  registrarMantenimiento,
  listarMantenimientos,
} = require("../controllers/recursoController");
const { verificarToken, verificarRol, verificarSuperAdmin } = require("../middleware/authMiddleware");

router.post("/", verificarToken, verificarSuperAdmin, crearRecurso);
router.get("/", verificarToken, listarRecursos);
router.get("/:id", verificarToken, obtenerRecurso);
router.put("/:id", verificarToken, verificarSuperAdmin, actualizarRecurso);
router.delete("/:id", verificarToken, verificarSuperAdmin, darDeBajaRecurso);

router.patch("/:id/estado", verificarToken, verificarRol("administrador"), cambiarEstado);
router.patch("/:id/horas", verificarToken, verificarRol("administrador"), actualizarHoras);
router.post("/:id/mantenimientos", verificarToken, verificarRol("administrador"), registrarMantenimiento);
router.get("/:id/mantenimientos", verificarToken, listarMantenimientos);

module.exports = router;
