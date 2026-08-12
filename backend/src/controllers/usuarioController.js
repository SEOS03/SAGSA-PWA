const bcrypt = require("bcryptjs");
const { User } = require("../models");
const { generarPasswordTemporal } = require("../utils/generarPassword");
const { enviarCorreoBienvenida } = require("../config/mailer");

const DPI_REGEX = /^\d{13}$/;

// POST /api/usuarios/crear (solo administradores)
async function crearUsuario(req, res) {
  try {
    const { nombre, correo, rol, dpi } = req.body;

    if (!nombre || !correo || !dpi) {
      return res.status(400).json({ mensaje: "Nombre, correo y DPI son obligatorios." });
    }

    if (!DPI_REGEX.test(dpi)) {
      return res.status(400).json({ mensaje: "El DPI debe tener exactamente 13 dígitos numéricos." });
    }

    if (rol === "administrador" && !req.usuario.esSuperAdmin) {
      return res.status(403).json({ mensaje: "No tiene permisos para crear administradores." });
    }

    const usuarioExistente = await User.findOne({ where: { correo } });
    if (usuarioExistente) {
      return res.status(409).json({ mensaje: "Ya existe una cuenta registrada con ese correo." });
    }

    const dpiExistente = await User.findOne({ where: { dpi } });
    if (dpiExistente) {
      return res.status(409).json({ mensaje: "Ya existe una cuenta registrada con ese DPI." });
    }

    const passwordTemporal = generarPasswordTemporal();
    const passwordHasheado = await bcrypt.hash(passwordTemporal, 10);

    const nuevoUsuario = await User.create({
      nombre,
      correo,
      dpi,
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

// GET /api/usuarios/buscar-por-dpi/:dpi (solo administradores)
async function buscarPorDpi(req, res) {
  try {
    const { dpi } = req.params;

    if (!DPI_REGEX.test(dpi)) {
      return res.status(400).json({ mensaje: "El DPI debe tener exactamente 13 dígitos numéricos." });
    }

    const usuario = await User.findOne({ where: { dpi } });
    if (!usuario) {
      return res.status(404).json({ mensaje: "No se encontró ningún usuario con ese DPI." });
    }

    // Un administrador regular solo puede buscar instructores/alumnos; el
    // super admin puede buscar cualquier usuario, incluyendo administradores.
    if (usuario.rol === "administrador" && !req.usuario.esSuperAdmin) {
      return res.status(403).json({ mensaje: "No tiene permisos para buscar administradores." });
    }

    return res.json({
      mensaje: "Usuario encontrado.",
      usuario: {
        nombre: usuario.nombre,
        correo: usuario.correo,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ mensaje: "Error al buscar el usuario." });
  }
}

module.exports = { crearUsuario, buscarPorDpi };
