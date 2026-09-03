const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// Lecturas de horómetro capturadas por instructor y alumno al inicio y fin
// de un vuelo, usadas para detectar discrepancias en las horas reportadas.
const LecturaHorometro = sequelize.define(
  "LecturaHorometro",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    vueloId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    recursoId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    horometroInicialSistema: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    horometroInicialInstructor: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    horometroFinalInstructor: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    horometroInicialAlumno: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    horometroFinalAlumno: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    horasSesionReportadas: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    observaciones: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    diferenciaDetectada: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    estado: {
      type: DataTypes.ENUM("pendiente_validacion", "validado", "en_disputa"),
      allowNull: false,
      defaultValue: "pendiente_validacion",
    },
  },
  {
    tableName: "lecturas_horometro",
    timestamps: true,
  }
);

module.exports = LecturaHorometro;
