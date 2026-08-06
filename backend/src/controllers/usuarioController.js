const bcrypt = require("bcryptjs");
const { User } = require("../models");
const { generarPasswordTemporal } = require("../utils/generarPassword");
const { enviarCorreoBienvenida } = require("../config/mailer");

// POST /api/usuarios/crear (solo administradores)
async function crearUsuario(req, res) {
  try {
    const { nombre, correo, rol } = req.body;

    if (!nombre || !correo) {
      return res.status(400).json({ mensaje: "Nombre y correo son obligatorios." });
    }

    if (rol === "administrador" && !req.usuario.esSuperAdmin) {
      return res.status(403).json({ mensaje: "No tiene permisos para crear administradores." });
    }

    const usuarioExistente = await User.findOne({ where: { correo } });
    if (usuarioExistente) {
      return res.status(409).json({ mensaje: "Ya existe una cuenta registrada con ese correo." });
    }

    const passwordTemporal = generarPasswordTemporal();
    const passwordHasheado = await bcrypt.hash(passwordTemporal, 10);

    const nuevoUsuario = await User.create({
      nombre,
      correo,
      password: passwordHasheado,
      rol: rol || "instructor",
      debeCambiarPassword: true,
    });

    let correoEnviado = true;
    try {
      await enviarCorreoBienvenida(correo, nombre, passwordTemporal);
    } catch (errorCorreo) {
      correoEnviado = false;
      console.error("No se pudo enviar el correo de bienvenida a", correo, "-", errorCorreo.message);
    }

    return res.status(201).json({
      mensaje: correoEnviado
        ? "Usuario creado correctamente. Se envió un correo con la contraseña temporal."
        : "Usuario creado, pero no se pudo enviar el correo con la contraseña temporal.",
      correoEnviado,
      usuario: {
        id: nuevoUsuario.id,
        nombre: nuevoUsuario.nombre,
        correo: nuevoUsuario.correo,
        rol: nuevoUsuario.rol,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ mensaje: "Error al crear el usuario." });
  }
}

module.exports = { crearUsuario };
