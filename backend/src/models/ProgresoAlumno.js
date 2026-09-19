const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// Avance de un alumno dentro de un programa de instrucción (Sprint 3)
const ProgresoAlumno = sequelize.define(
  "ProgresoAlumno",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    alumnoId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    programaId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    // Puede quedar sin asignar al inscribir; se asigna o reasigna después
    // sin ninguna restricción ni historial.
    instructorAsignadoId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    leccionActual: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    vueloSoloCompletado: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    horasSimuladorAcumuladas: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    horasAvionAcumuladas: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    estadoPrograma: {
      type: DataTypes.ENUM("en_curso", "pendiente_chequeo", "completado"),
      allowNull: false,
      defaultValue: "en_curso",
    },
    fechaInicio: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    fechaCompletado: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "progreso_alumnos",
    timestamps: true,
  }
);

module.exports = ProgresoAlumno;
