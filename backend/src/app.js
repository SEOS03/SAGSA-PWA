const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const usuarioRoutes = require("./routes/usuarioRoutes");

const app = express();

app.use(cors());
app.use(express.json());

// Ruta simple para confirmar que el servidor está vivo
app.get("/api/health", (req, res) => {
  res.json({ estado: "ok", mensaje: "Servidor Sagsa PWA funcionando correctamente." });
});

app.use("/api/auth", authRoutes);
app.use("/api/usuarios", usuarioRoutes);

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ mensaje: "Ruta no encontrada." });
});

module.exports = app;
