const express = require("express");
const router = express.Router();
const { listarReporteVuelos } = require("../controllers/reporteController");
const { verificarToken, verificarRol } = require("../middleware/authMiddleware");

// verificarRol("administrador") ya cubre admin regular Y super admin (ambos
// tienen rol "administrador"; el super admin solo se distingue por
// esSuperAdmin=true) — instructor/alumno quedan excluidos automáticamente,
// igual que en recursoRoutes.js/progresoRoutes.js.
router.get("/vuelos", verificarToken, verificarRol("administrador"), listarReporteVuelos);

module.exports = router;
