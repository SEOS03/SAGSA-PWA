const sequelize = require("../config/database");
const User = require("./User");
const PasswordResetToken = require("./PasswordResetToken");
const Recurso = require("./Recurso");
const Mantenimiento = require("./Mantenimiento");
const SolicitudCambio = require("./SolicitudCambio");

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

module.exports = {
  sequelize,
  User,
  PasswordResetToken,
  Recurso,
  Mantenimiento,
  SolicitudCambio,
};
