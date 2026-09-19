const bcrypt = require("bcryptjs");
const { User } = require("../models");
const { generarPasswordTemporal } = require("../utils/generarPassword");
const { enviarCorreoBienvenida } = require("../config/mailer");

const DPI_REGEX = /^\d{13}$/;
const ROLES_VALIDOS = ["administrador", "instructor", "alumno"];

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
        id: usuario.id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol: usuario.rol,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ mensaje: "Error al buscar el usuario." });
  }
}

// PATCH /api/usuarios/:id/permiso-validar-horometro (solo super admin)
async function otorgarPermisoValidarHorometro(req, res) {
  try {
    const { puedeValidarHorometro } = req.body;

    if (typeof puedeValidarHorometro !== "boolean") {
      return res.status(400).json({ mensaje: "puedeValidarHorometro es obligatorio y debe ser true o false." });
    }

    const usuario = await User.findByPk(req.params.id);
    if (!usuario) {
      return res.status(404).json({ mensaje: "Usuario no encontrado." });
    }

    // El permiso solo tiene sentido para administradores regulares: el
    // super admin ya puede validar sin él, y no aplica a instructor/alumno.
    if (usuario.rol !== "administrador" || usuario.esSuperAdmin) {
      return res.status(400).json({
        mensaje: "Este permiso solo se puede otorgar o revocar a administradores regulares (no a instructor, alumno, ni a otro super admin).",
      });
    }

    usuario.puedeValidarHorometro = puedeValidarHorometro;
    await usuario.save();

    return res.json({
      mensaje: puedeValidarHorometro
        ? "Permiso de validación de horómetro otorgado correctamente."
        : "Permiso de validación de horómetro revocado correctamente.",
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol: usuario.rol,
        puedeValidarHorometro: usuario.puedeValidarHorometro,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ mensaje: "Error al actualizar el permiso de validación de horómetro." });
  }
}

// GET /api/usuarios?rol=instructor (cualquier usuario autenticado, excepto
// para rol=administrador que sigue siendo solo administradores).
// Usado por el formulario de creación de vuelos para poblar los
// selectores de instructor/alumno: un instructor necesita listar alumnos y
// un alumno necesita listar instructores, no solo el administrador.
async function listarUsuarios(req, res) {
  try {
    const { rol } = req.query;

    if (!rol || !ROLES_VALIDOS.includes(rol)) {
      return res.status(400).json({ mensaje: `rol es obligatorio y debe ser uno de: ${ROLES_VALIDOS.join(", ")}.` });
    }

    const rolSolicitante = req.usuario.rol;

    // Un alumno solo puede listar instructores; un instructor solo puede
    // listar alumnos. Administrador y super admin no tienen restricción.
    if (rolSolicitante === "alumno" && rol !== "instructor") {
      return res.status(403).json({ mensaje: "Un alumno solo puede consultar la lista de instructores." });
    }

    if (rolSolicitante === "instructor" && rol !== "alumno") {
      return res.status(403).json({ mensaje: "Un instructor solo puede consultar la lista de alumnos." });
    }

    // Solo administrador/super admin reciben el correo (y, para poblar la
    // pantalla de Permisos de Validación, esSuperAdmin/puedeValidarHorometro);
    // cualquier otro rol consultante recibe estrictamente id y nombre.
    const atributos =
      rolSolicitante === "administrador"
        ? ["id", "nombre", "correo", "esSuperAdmin", "puedeValidarHorometro"]
        : ["id", "nombre"];

    const usuarios = await User.findAll({
      where: { rol, activo: true },
      attributes: atributos,
      order: [["nombre", "ASC"]],
    });

    return res.json({ mensaje: "Usuarios obtenidos correctamente.", usuarios });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ mensaje: "Error al obtener los usuarios." });
  }
}

module.exports = { crearUsuario, buscarPorDpi, otorgarPermisoValidarHorometro, listarUsuarios };
