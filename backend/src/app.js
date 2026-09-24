const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const usuarioRoutes = require("./routes/usuarioRoutes");
const recursoRoutes = require("./routes/recursoRoutes");
const mantenimientoRoutes = require("./routes/mantenimientoRoutes");
const solicitudRoutes = require("./routes/solicitudRoutes");
const vueloRoutes = require("./routes/vueloRoutes");
const alumnoRoutes = require("./routes/alumnoRoutes");
const progresoRoutes = require("./routes/progresoRoutes");
const programaRoutes = require("./routes/programaRoutes");
const reporteRoutes = require("./routes/reporteRoutes");

const app = express();

app.use(cors());
app.use(express.json());

// Ruta simple para confirmar que el servidor está vivo
app.get("/api/health", (req, res) => {
  res.json({ estado: "ok", mensaje: "Servidor Sagsa PWA funcionando correctamente." });
});

app.use("/api/auth", authRoutes);
app.use("/api/usuarios", usuarioRoutes);
app.use("/api/recursos", recursoRoutes);
app.use("/api/mantenimientos", mantenimientoRoutes);
app.use("/api/solicitudes", solicitudRoutes);
app.use("/api/vuelos", vueloRoutes);
app.use("/api/alumnos", alumnoRoutes);
app.use("/api/progreso", progresoRoutes);
app.use("/api/programas", programaRoutes);
app.use("/api/reportes", reporteRoutes);

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ mensaje: "Ruta no encontrada." });
});

module.exports = app;
