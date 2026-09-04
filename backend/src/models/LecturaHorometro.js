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
    // "en_progreso" se agregó en el Paso 5: el registro nace así apenas
    // reporta el primer actor (instructor o alumno) y solo pasa a
    // "pendiente_validacion" cuando AMBOS ya reportaron. Sin este estado
    // inicial distinto, un registro con un solo reporte habría quedado
    // marcado "pendiente_validacion" desde el arranque (ese era el default
    // original del Paso 1) y se hubiera podido validar antes de tiempo,
    // con campos del segundo actor todavía en null.
    estado: {
      type: DataTypes.ENUM("en_progreso", "pendiente_validacion", "validado", "en_disputa"),
      allowNull: false,
      defaultValue: "en_progreso",
    },
    // Verificaciones informativas calculadas cuando ambos reportes ya están
    // presentes (Paso 5) — nunca se autoaplican, solo apoyan al validador.
    coincidenciaHorometroInicial: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    coherenciaHorometroFinal: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    validadoPor: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    fechaValidacion: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "lecturas_horometro",
    timestamps: true,
  }
);

module.exports = LecturaHorometro;
