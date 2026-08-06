const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User } = require("../models");

// POST /api/auth/login
async function iniciarSesion(req, res) {
  try {
    const { correo, password } = req.body;

    if (!correo || !password) {
      return res.status(400).json({ mensaje: "Correo y contraseña son obligatorios." });
    }

    const usuario = await User.findOne({ where: { correo } });
    if (!usuario) {
      return res.status(401).json({ mensaje: "Correo o contraseña incorrectos." });
    }

    const passwordValido = await bcrypt.compare(password, usuario.password);
    if (!passwordValido) {
      return res.status(401).json({ mensaje: "Correo o contraseña incorrectos." });
    }

    if (!usuario.activo) {
      return res.status(403).json({ mensaje: "Esta cuenta ha sido desactivada." });
    }

    const token = jwt.sign(
      { id: usuario.id, rol: usuario.rol, nombre: usuario.nombre, esSuperAdmin: usuario.esSuperAdmin },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
    );

    return res.json({
      mensaje: "Inicio de sesión exitoso.",
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol: usuario.rol,
        esSuperAdmin: usuario.esSuperAdmin,
        debeCambiarPassword: usuario.debeCambiarPassword,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ mensaje: "Error al iniciar sesión." });
  }
}

// GET /api/auth/perfil (ruta protegida, de prueba)
async function obtenerPerfil(req, res) {
  const usuario = await User.findByPk(req.usuario.id, {
    attributes: ["id", "nombre", "correo", "rol", "activo", "debeCambiarPassword", "esSuperAdmin"],
  });
  return res.json({ usuario });
}

// POST /api/auth/cambiar-password (ruta protegida)
async function cambiarPassword(req, res) {
  try {
    const { passwordActual, passwordNueva } = req.body;

    if (!passwordActual || !passwordNueva) {
      return res.status(400).json({ mensaje: "La contraseña actual y la nueva son obligatorias." });
    }

    if (passwordNueva.length < 6) {
      return res.status(400).json({ mensaje: "La nueva contraseña debe tener al menos 6 caracteres." });
    }

    const usuario = await User.findByPk(req.usuario.id);
    if (!usuario) {
      return res.status(404).json({ mensaje: "Usuario no encontrado." });
    }

    const passwordValido = await bcrypt.compare(passwordActual, usuario.password);
    if (!passwordValido) {
      return res.status(401).json({ mensaje: "La contraseña actual es incorrecta." });
    }

    usuario.password = await bcrypt.hash(passwordNueva, 10);
    usuario.debeCambiarPassword = false;
    await usuario.save();

    return res.json({ mensaje: "Contraseña actualizada correctamente." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ mensaje: "Error al cambiar la contraseña." });
  }
}

module.exports = { iniciarSesion, obtenerPerfil, cambiarPassword };
