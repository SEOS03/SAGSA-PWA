const express = require("express");
const router = express.Router();
const {
  crearVuelo,
  listarVuelos,
  obtenerVuelo,
  cancelarVuelo,
  confirmarInstructor,
  confirmarAlumno,
  aprobarSuperAdmin,
} = require("../controllers/vueloController");
const { verificarToken, verificarSuperAdmin } = require("../middleware/authMiddleware");

router.post("/", verificarToken, crearVuelo);
router.get("/", verificarToken, listarVuelos);
router.get("/:id", verificarToken, obtenerVuelo);
router.patch("/:id/cancelar", verificarToken, cancelarVuelo);
router.patch("/:id/confirmar-instructor", verificarToken, confirmarInstructor);
router.patch("/:id/confirmar-alumno", verificarToken, confirmarAlumno);
router.patch("/:id/aprobar-superadmin", verificarToken, verificarSuperAdmin, aprobarSuperAdmin);

module.exports = router;
