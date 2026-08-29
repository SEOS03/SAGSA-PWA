const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// Historial de mantenimientos (preventivos y correctivos) de un recurso
const Mantenimiento = sequelize.define(
  "Mantenimiento",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    recursoId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    tipoMantenimiento: {
      type: DataTypes.ENUM("preventivo", "correctivo"),
      allowNull: false,
    },
    fechaInicio: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    fechaFin: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    horasAlIngreso: {
      type: DataTypes.DECIMAL(10, 2),
    },
    descripcion: {
      type: DataTypes.TEXT,
    },
    estado: {
      type: DataTypes.ENUM("en_proceso", "completado"),
      allowNull: false,
      defaultValue: "en_proceso",
    },
  },
  {
    tableName: "mantenimientos",
    timestamps: true,
  }
);

module.exports = Mantenimiento;
