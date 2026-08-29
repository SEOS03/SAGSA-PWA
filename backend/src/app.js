const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const usuarioRoutes = require("./routes/usuarioRoutes");
const recursoRoutes = require("./routes/recursoRoutes");
const mantenimientoRoutes = require("./routes/mantenimientoRoutes");
const solicitudRoutes = require("./routes/solicitudRoutes");

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

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ mensaje: "Ruta no encontrada." });
});

module.exports = app;
