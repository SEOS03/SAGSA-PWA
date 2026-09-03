const express = require("express");
const router = express.Router();
const { crearVuelo, listarVuelos, obtenerVuelo, cancelarVuelo } = require("../controllers/vueloController");
const { verificarToken } = require("../middleware/authMiddleware");

router.post("/", verificarToken, crearVuelo);
router.get("/", verificarToken, listarVuelos);
router.get("/:id", verificarToken, obtenerVuelo);
router.patch("/:id/cancelar", verificarToken, cancelarVuelo);

module.exports = router;
