require("dotenv").config();
const app = require("./app");
const { sequelize } = require("./models");

const PORT = process.env.PORT || 4000;

// sequelize.sync({ alter: true }) recrea las llaves foráneas de cualquier
// tabla con 2+ FKs en cada sync (limitación conocida del diffing de
// Sequelize con MySQL). Si dos procesos sincronizan casi al mismo tiempo
// (ej. un reinicio "en caliente" de nodemon donde el proceso viejo no
// cerró su conexión antes de que el nuevo arrancara su propio alter),
// ambos pueden calcular el mismo nombre de restricción a borrar y el
// segundo falla con "Can't DROP ...; check that column/key exists".
// Este lock de MySQL (GET_LOCK/RELEASE_LOCK) serializa los sync: el
// segundo proceso espera en vez de competir por las mismas llaves.
const NOMBRE_LOCK_SYNC = "sagsa_pwa_sync_lock";
const TIMEOUT_LOCK_SYNC_SEGUNDOS = 10;

async function sincronizarConLock() {
  // OJO: este sequelize.transaction() NO da atomicidad real sobre el sync().
  // Se usa únicamente para fijar una sola conexión del pool durante todo
  // el bloque, porque GET_LOCK/RELEASE_LOCK son de alcance por conexión
  // (deben ejecutarse sobre la misma sesión para que el RELEASE_LOCK sea
  // válido). El propio sequelize.sync({ alter: true }) de abajo NO corre
  // dentro de esta transacción: pide sus propias conexiones al pool para
  // cada sentencia DDL, y en MySQL cada DDL hace un commit implícito de
  // por sí. Si el sync falla a la mitad, lo ya aplicado queda aplicado —
  // no hay rollback posible, ni por parte de MySQL ni de este wrapper.
  await sequelize.transaction(async (t) => {
    const [[{ obtenido }]] = await sequelize.query("SELECT GET_LOCK(?, ?) AS obtenido", {
      replacements: [NOMBRE_LOCK_SYNC, TIMEOUT_LOCK_SYNC_SEGUNDOS],
      transaction: t,
    });

    if (Number(obtenido) !== 1) {
      throw new Error(
        `No se pudo obtener el lock de sincronización "${NOMBRE_LOCK_SYNC}" tras ${TIMEOUT_LOCK_SYNC_SEGUNDOS}s (otro proceso sigue sincronizando).`
      );
    }

    try {
      await sequelize.sync({ alter: true });
    } finally {
      await sequelize.query("SELECT RELEASE_LOCK(?)", {
        replacements: [NOMBRE_LOCK_SYNC],
        transaction: t,
      });
    }
  });
}

// Redes de seguridad: capturan errores que ocurrirían fuera de cualquier try/catch
// y los imprimen en la terminal, en vez de dejar que el proceso muera en silencio.
process.on("uncaughtException", (error) => {
  console.error("Error no capturado (uncaughtException):", error);
});

process.on("unhandledRejection", (error) => {
  console.error("Promesa rechazada sin manejar (unhandledRejection):", error);
});
async function iniciarServidor() {
  try {
    await sequelize.authenticate();
    console.log("Conexión a MySQL establecida correctamente.");

    // Crea/actualiza las tablas según los modelos definidos (solo para desarrollo)
    await sincronizarConLock();
    console.log("Modelos sincronizados con la base de datos.");

    app.listen(PORT, () => {
      console.log(`Servidor corriendo en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("No se pudo conectar a la base de datos:", error.message);
    process.exit(1);
  }
}

iniciarServidor();
