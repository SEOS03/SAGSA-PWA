const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { User, PasswordResetToken } = require("../models");
const { enviarCorreoRecuperacion } = require("../config/mailer");

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
        puedeValidarHorometro: usuario.puedeValidarHorometro,
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
    attributes: ["id", "nombre", "correo", "rol", "activo", "debeCambiarPassword", "esSuperAdmin", "puedeValidarHorometro"],
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

// POST /api/auth/solicitar-recuperacion
async function solicitarRecuperacion(req, res) {
  try {
    const { correo } = req.body;

    if (!correo) {
      return res.status(400).json({ mensaje: "El correo es obligatorio." });
    }

    // La respuesta es siempre la misma exista o no el correo, para no
    // revelar qué direcciones están registradas (enumeración de usuarios).
    const mensajeGenerico = "Si el correo existe en el sistema, recibirás un enlace para restablecer tu contraseña.";

    const usuario = await User.findOne({ where: { correo } });
    if (usuario) {
      const token = crypto.randomBytes(32).toString("hex");
      const expiracion = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

      await PasswordResetToken.create({ token, usuarioId: usuario.id, expiracion });

      const enlace = `${process.env.FRONTEND_URL || "http://localhost:5173"}/restablecer-password?token=${token}`;

      try {
        await enviarCorreoRecuperacion(usuario.correo, usuario.nombre, enlace);
      } catch (errorCorreo) {
        console.error("No se pudo enviar el correo de recuperación a", usuario.correo, "-", errorCorreo.message);
      }
    }

    return res.json({ mensaje: mensajeGenerico });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ mensaje: "Error al procesar la solicitud." });
  }
}

// POST /api/auth/restablecer-password
async function restablecerPassword(req, res) {
  try {
    const { token, nuevaPassword } = req.body;

    if (!token || !nuevaPassword) {
      return res.status(400).json({ mensaje: "El token y la nueva contraseña son obligatorios." });
    }

    if (nuevaPassword.length < 6) {
      return res.status(400).json({ mensaje: "La nueva contraseña debe tener al menos 6 caracteres." });
    }

    const registroToken = await PasswordResetToken.findOne({ where: { token } });

    if (!registroToken || registroToken.usado || registroToken.expiracion < new Date()) {
      return res.status(400).json({ mensaje: "El enlace no es válido o ha expirado." });
    }

    const usuario = await User.findByPk(registroToken.usuarioId);
    if (!usuario) {
      return res.status(404).json({ mensaje: "Usuario no encontrado." });
    }

    usuario.password = await bcrypt.hash(nuevaPassword, 10);
    usuario.debeCambiarPassword = false;
    await usuario.save();

    registroToken.usado = true;
    await registroToken.save();

    return res.json({ mensaje: "Contraseña actualizada correctamente." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ mensaje: "Error al restablecer la contraseña." });
  }
}

module.exports = {
  iniciarSesion,
  obtenerPerfil,
  cambiarPassword,
  solicitarRecuperacion,
  restablecerPassword,
};
