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
      validate: { isEmail: true },
    },
    dpi: {
      type: DataTypes.STRING(13),
      allowNull: false,
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
    // Solo tiene efecto en usuarios con rol "administrador". El super admin
    // siempre puede validar horómetros sin necesidad de este campo — eso se
    // verifica en el controlador (esSuperAdmin), no aquí.
    puedeValidarHorometro: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    tableName: "usuarios",
    timestamps: true, // agrega createdAt y updatedAt automáticamente
    // Índices únicos declarados aquí (con nombre fijo) en vez de "unique: true"
    // en la columna: es la forma que sequelize.sync({alter:true}) sí reconoce
    // como ya existente entre reinicios, sin duplicarla cada vez.
    indexes: [
      { unique: true, fields: ["correo"], name: "uq_usuarios_correo" },
      { unique: true, fields: ["dpi"], name: "uq_usuarios_dpi" },
    ],
  }
);

module.exports = User;
