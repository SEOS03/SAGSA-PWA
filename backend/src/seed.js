// Script de inicialización manual: crea el administrador master.
// Se ejecuta una sola vez con "npm run seed" (nunca a través de una ruta de la API),
// ya que /api/usuarios/crear ahora requiere sesión de administrador para funcionar,
// y este usuario resuelve el problema de "quién crea al primer administrador".
require("dotenv").config();
const bcrypt = require("bcryptjs");
const { sequelize, User } = require("./models");

async function ejecutarSeed() {
  const nombre = process.env.MASTER_ADMIN_NOMBRE;
  const correo = process.env.MASTER_ADMIN_CORREO;
  const password = process.env.MASTER_ADMIN_PASSWORD;
  const dpi = process.env.MASTER_ADMIN_DPI;

  if (!nombre || !correo || !password || !dpi) {
    console.error(
      "❌ Faltan MASTER_ADMIN_NOMBRE, MASTER_ADMIN_CORREO, MASTER_ADMIN_PASSWORD o MASTER_ADMIN_DPI en el archivo .env."
    );
    process.exit(1);
  }

  if (!/^\d{13}$/.test(dpi)) {
    console.error("❌ MASTER_ADMIN_DPI debe tener exactamente 13 dígitos numéricos.");
    process.exit(1);
  }

  await sequelize.authenticate();
  await sequelize.sync();

  const usuarioExistente = await User.findOne({ where: { correo } });
  if (usuarioExistente) {
    console.log(`ℹ️ Ya existe un usuario con el correo ${correo}. No se creó ningún administrador nuevo.`);
    process.exit(0);
  }

  const passwordHasheado = await bcrypt.hash(password, 10);
  await User.create({
    nombre,
    correo,
    dpi,
    password: passwordHasheado,
    rol: "administrador",
    debeCambiarPassword: true,
    esSuperAdmin: true,
  });

  console.log(`✅ Administrador master creado correctamente: ${correo}`);
  process.exit(0);
}

ejecutarSeed().catch((error) => {
  console.error("❌ Error al ejecutar el seed:", error.message);
  process.exit(1);
});
