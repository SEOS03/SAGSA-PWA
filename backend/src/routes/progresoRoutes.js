const express = require("express");
const router = express.Router();
const {
  inscribirAlumno,
  reasignarInstructor,
  listarProgresoPorAlumno,
  obtenerMiProgreso,
  obtenerMisAlumnos,
} = require("../controllers/progresoController");
const { verificarToken, verificarRol } = require("../middleware/authMiddleware");

router.post("/", verificarToken, verificarRol("administrador"), inscribirAlumno);
router.get("/", verificarToken, verificarRol("administrador"), listarProgresoPorAlumno);
router.patch("/:id/instructor", verificarToken, verificarRol("administrador"), reasignarInstructor);
router.get("/mio", verificarToken, verificarRol("alumno"), obtenerMiProgreso);
router.get("/mis-alumnos", verificarToken, verificarRol("instructor"), obtenerMisAlumnos);

module.exports = router;
