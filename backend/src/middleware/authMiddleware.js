const jwt = require("jsonwebtoken");

// Verifica que la solicitud incluya un token JWT válido antes de continuar
function verificarToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ mensaje: "No se proporcionó un token de acceso." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const datosUsuario = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = datosUsuario; // disponible en los controladores siguientes (id, rol)
    next();
  } catch {
    return res.status(403).json({ mensaje: "Token inválido o expirado." });
  }
}

// Middleware adicional: restringe el acceso según el rol del usuario
// Uso: verificarRol("administrador") o verificarRol("administrador", "instructor")
function verificarRol(...rolesPermitidos) {
  return (req, res, next) => {
    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({ mensaje: "No tiene permisos para esta acción." });
    }
    next();
  };
}

// Middleware adicional: restringe el acceso exclusivamente al super administrador
// (un usuario con rol "administrador" y esSuperAdmin = true)
function verificarSuperAdmin(req, res, next) {
  if (!req.usuario.esSuperAdmin) {
    return res.status(403).json({ mensaje: "Solo el super administrador puede realizar esta acción." });
  }
  next();
}

module.exports = { verificarToken, verificarRol, verificarSuperAdmin };
