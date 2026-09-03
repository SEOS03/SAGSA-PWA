const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// Catálogo de programas de instrucción (Sprint 3 — Módulo de Vuelos).
// totalLecciones y leccionSolo solo aplican al programa piloto_privado.
const Programa = sequelize.define(
  "Programa",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    nombre: {
      type: DataTypes.ENUM("piloto_privado", "ifr", "bimotor", "comercial"),
      allowNull: false,
    },
    horasSimuladorTotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    horasAvionTotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    totalLecciones: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    leccionSolo: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    tableName: "programas",
    timestamps: true,
    indexes: [{ unique: true, fields: ["nombre"], name: "uq_programas_nombre" }],
  }
);

module.exports = Programa;
