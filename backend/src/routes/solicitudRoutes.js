const express = require("express");
const router = express.Router();
const {
  listarSolicitudes,
  listarMisSolicitudes,
  aprobarSolicitud,
  rechazarSolicitud,
} = require("../controllers/solicitudController");
const { verificarToken, verificarRol, verificarSuperAdmin } = require("../middleware/authMiddleware");

router.get("/mias", verificarToken, verificarRol("administrador"), listarMisSolicitudes);
router.get("/", verificarToken, verificarSuperAdmin, listarSolicitudes);
router.put("/:id/aprobar", verificarToken, verificarSuperAdmin, aprobarSolicitud);
router.put("/:id/rechazar", verificarToken, verificarSuperAdmin, rechazarSolicitud);

module.exports = router;
