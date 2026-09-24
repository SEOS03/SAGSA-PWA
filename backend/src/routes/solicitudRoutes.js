const express = require("express");
const router = express.Router();
const {
  listarSolicitudes,
  aprobarSolicitud,
  rechazarSolicitud,
} = require("../controllers/solicitudController");
const { verificarToken, verificarSuperAdmin } = require("../middleware/authMiddleware");

router.get("/", verificarToken, listarSolicitudes);
router.put("/:id/aprobar", verificarToken, verificarSuperAdmin, aprobarSolicitud);
router.put("/:id/rechazar", verificarToken, verificarSuperAdmin, rechazarSolicitud);

module.exports = router;
