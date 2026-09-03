const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// Tokens de un solo uso para el flujo de "olvidé mi contraseña"
const PasswordResetToken = sequelize.define(
  "PasswordResetToken",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    token: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    usuarioId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    expiracion: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    usado: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    tableName: "password_reset_tokens",
    timestamps: true,
    indexes: [{ unique: true, fields: ["token"], name: "uq_password_reset_tokens_token" }],
  }
);

module.exports = PasswordResetToken;
