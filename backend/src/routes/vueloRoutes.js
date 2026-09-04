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
const {
  registrarHorometroInstructor,
  registrarHorometroAlumno,
  obtenerHorometro,
  validarHorometro,
} = require("../controllers/horometroController");
const { verificarToken, verificarSuperAdmin } = require("../middleware/authMiddleware");

router.post("/", verificarToken, crearVuelo);
router.get("/", verificarToken, listarVuelos);
router.get("/:id", verificarToken, obtenerVuelo);
router.patch("/:id/cancelar", verificarToken, cancelarVuelo);
router.patch("/:id/confirmar-instructor", verificarToken, confirmarInstructor);
router.patch("/:id/confirmar-alumno", verificarToken, confirmarAlumno);
router.patch("/:id/aprobar-superadmin", verificarToken, verificarSuperAdmin, aprobarSuperAdmin);

router.post("/:id/horometro-instructor", verificarToken, registrarHorometroInstructor);
router.post("/:id/horometro-alumno", verificarToken, registrarHorometroAlumno);
router.get("/:id/horometro", verificarToken, obtenerHorometro);
router.put("/:id/horometro/validar", verificarToken, validarHorometro);

module.exports = router;
