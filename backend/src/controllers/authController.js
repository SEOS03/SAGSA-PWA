const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User } = require("../models");

// POST /api/auth/registro
async function registrar(req, res) {
  try {
    const { nombre, correo, password, rol } = req.body;

    if (!nombre || !correo || !password) {
      return res.status(400).json({ mensaje: "Nombre, correo y contraseña son obligatorios." });
    }

    const usuarioExistente = await User.findOne({ where: { correo } });
    if (usuarioExistente) {
      return res.status(409).json({ mensaje: "Ya existe una cuenta registrada con ese correo." });
    }

    const passwordHasheado = await bcrypt.hash(password, 10);

    const nuevoUsuario = await User.create({
      nombre,
      correo,
      password: passwordHasheado,
      rol: rol || "instructor",
    });

    return res.status(201).json({
      mensaje: "Usuario registrado correctamente.",
      usuario: {
        id: nuevoUsuario.id,
        nombre: nuevoUsuario.nombre,
        correo: nuevoUsuario.correo,
        rol: nuevoUsuario.rol,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ mensaje: "Error al registrar el usuario." });
  }
}

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
      { id: usuario.id, rol: usuario.rol, nombre: usuario.nombre },
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
    attributes: ["id", "nombre", "correo", "rol", "activo"],
  });
  return res.json({ usuario });
}

module.exports = { registrar, iniciarSesion, obtenerPerfil };
