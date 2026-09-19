const sequelize = require("../config/database");
const User = require("./User");
const PasswordResetToken = require("./PasswordResetToken");
const Recurso = require("./Recurso");
const Mantenimiento = require("./Mantenimiento");
const SolicitudCambio = require("./SolicitudCambio");
const Programa = require("./Programa");
const ProgresoAlumno = require("./ProgresoAlumno");
const Vuelo = require("./Vuelo");
const LecturaHorometro = require("./LecturaHorometro");

User.hasMany(PasswordResetToken, { foreignKey: "usuarioId" });
PasswordResetToken.belongsTo(User, { foreignKey: "usuarioId" });

// Un recurso no puede eliminarse físicamente si tiene mantenimientos asociados
Recurso.hasMany(Mantenimiento, { foreignKey: "recursoId", onDelete: "RESTRICT" });
Mantenimiento.belongsTo(Recurso, { foreignKey: "recursoId" });

Recurso.hasMany(SolicitudCambio, { foreignKey: "recursoId" });
SolicitudCambio.belongsTo(Recurso, { foreignKey: "recursoId" });

User.hasMany(SolicitudCambio, { foreignKey: "solicitadoPor", as: "solicitudesCreadas" });
SolicitudCambio.belongsTo(User, { foreignKey: "solicitadoPor", as: "solicitante" });

User.hasMany(SolicitudCambio, { foreignKey: "revisadoPor", as: "solicitudesRevisadas" });
SolicitudCambio.belongsTo(User, { foreignKey: "revisadoPor", as: "revisor" });

// ---------- Sprint 3 — Módulo de Vuelos (Paso 1: solo estructura) ----------

Programa.hasMany(ProgresoAlumno, { foreignKey: "programaId" });
ProgresoAlumno.belongsTo(Programa, { foreignKey: "programaId" });

User.hasMany(ProgresoAlumno, { foreignKey: "alumnoId", as: "progresos" });
ProgresoAlumno.belongsTo(User, { foreignKey: "alumnoId", as: "alumno" });

User.hasMany(ProgresoAlumno, { foreignKey: "instructorAsignadoId", as: "progresosComoInstructor" });
ProgresoAlumno.belongsTo(User, { foreignKey: "instructorAsignadoId", as: "instructorAsignado" });

Recurso.hasMany(Vuelo, { foreignKey: "recursoId" });
Vuelo.belongsTo(Recurso, { foreignKey: "recursoId", as: "recurso" });

User.hasMany(Vuelo, { foreignKey: "instructorId", as: "vuelosComoInstructor" });
Vuelo.belongsTo(User, { foreignKey: "instructorId", as: "instructor" });

User.hasMany(Vuelo, { foreignKey: "alumnoId", as: "vuelosComoAlumno" });
Vuelo.belongsTo(User, { foreignKey: "alumnoId", as: "alumno" });

Vuelo.hasOne(LecturaHorometro, { foreignKey: "vueloId" });
LecturaHorometro.belongsTo(Vuelo, { foreignKey: "vueloId" });

// Paso 5: para que GET del horómetro pueda mostrar quién validó sin una
// segunda consulta ("transparencia entre validadores").
User.hasMany(LecturaHorometro, { foreignKey: "validadoPor", as: "horometrosValidados" });
LecturaHorometro.belongsTo(User, { foreignKey: "validadoPor", as: "validador" });

module.exports = {
  sequelize,
  User,
  PasswordResetToken,
  Recurso,
  Mantenimiento,
  SolicitudCambio,
  Programa,
  ProgresoAlumno,
  Vuelo,
  LecturaHorometro,
};
