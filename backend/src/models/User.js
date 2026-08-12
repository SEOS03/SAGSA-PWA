const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// Módulo 1 — Gestión de usuarios y roles
// Cada usuario se registra con su correo personal (funciona como identificador de inicio de sesión)
const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    correo: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    dpi: {
      type: DataTypes.STRING(13),
      allowNull: false,
      unique: true,
      validate: { is: /^\d{13}$/ },
    },
    password: {
      type: DataTypes.STRING, // se almacena el hash, nunca la contraseña en texto plano
      allowNull: false,
    },
    rol: {
      type: DataTypes.ENUM("administrador", "instructor", "alumno"),
      allowNull: false,
      defaultValue: "instructor",
    },
    activo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    debeCambiarPassword: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    esSuperAdmin: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    tableName: "usuarios",
    timestamps: true, // agrega createdAt y updatedAt automáticamente
  }
);

module.exports = User;
