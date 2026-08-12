const sequelize = require("../config/database");
const User = require("./User");
const PasswordResetToken = require("./PasswordResetToken");

User.hasMany(PasswordResetToken, { foreignKey: "usuarioId" });
PasswordResetToken.belongsTo(User, { foreignKey: "usuarioId" });

module.exports = {
  sequelize,
  User,
  PasswordResetToken,
};
