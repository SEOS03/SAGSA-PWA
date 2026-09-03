const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// Programación de vuelos (Sprint 3 — Módulo de Vuelos).
// Modelo creado completo en este paso; ningún endpoint lo usa todavía.
const Vuelo = sequelize.define(
  "Vuelo",
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
    instructorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    alumnoId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    fechaHora: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    duracionMinutos: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    estado: {
      type: DataTypes.ENUM("en_proceso", "confirmado", "en_curso", "finalizado", "cancelado"),
      allowNull: false,
      defaultValue: "en_proceso",
    },
    leccionProgramada: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    confirmacionInstructor: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    confirmacionAlumno: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    aprobacionSuperAdmin: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    prioridadCalculada: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    motivoCancelacion: {
      type: DataTypes.ENUM(
        "cancelado_por_alumno",
        "cancelado_por_instructor",
        "cancelado_por_mantenimiento_aeronave",
        "cancelado_por_clima",
        "otro"
      ),
      allowNull: true,
    },
    canceladoPor: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    creadoPor: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    tableName: "vuelos",
    timestamps: true,
  }
);

module.exports = Vuelo;
