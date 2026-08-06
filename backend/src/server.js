require("dotenv").config();
const app = require("./app");
const { sequelize } = require("./models");

const PORT = process.env.PORT || 4000;
// Redes de seguridad: capturan errores que ocurrirían fuera de cualquier try/catch
// y los imprimen en la terminal, en vez de dejar que el proceso muera en silencio.
process.on("uncaughtException", (error) => {
  console.error("❌ Error no capturado (uncaughtException):", error);
});

process.on("unhandledRejection", (error) => {
  console.error("❌ Promesa rechazada sin manejar (unhandledRejection):", error);
});
async function iniciarServidor() {
  try {
    await sequelize.authenticate();
    console.log("✅ Conexión a MySQL establecida correctamente.");

    // Crea/actualiza las tablas según los modelos definidos (solo para desarrollo)
    await sequelize.sync({ alter: true });
    console.log("✅ Modelos sincronizados con la base de datos.");

    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ No se pudo conectar a la base de datos:", error.message);
    process.exit(1);
  }
}

iniciarServidor();
