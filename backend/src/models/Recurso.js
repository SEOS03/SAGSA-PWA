const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// Módulo 2 — Gestión de recursos (aeronaves y simuladores)
// Se agrupan bajo una misma tabla para que el módulo de Vuelos (Sprint 3)
// pueda referenciar cualquiera de los dos de forma genérica.
const Recurso = sequelize.define(
  "Recurso",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    matricula: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    modelo: {
      type: DataTypes.STRING,
    },
    tipoRecurso: {
      type: DataTypes.ENUM("ala_fija", "ala_rotativa", "simulador"),
      allowNull: false,
    },
    estado: {
      type: DataTypes.ENUM(
        "disponible",
        "en_vuelo",
        "proximo_a_mantenimiento",
        "en_mantenimiento",
        "fuera_de_servicio"
      ),
      allowNull: false,
      defaultValue: "disponible",
    },
    horasAcumuladas: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    horasParaMantenimiento: {
      type: DataTypes.DECIMAL(10, 2),
    },
    activo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true, // baja lógica, nunca se elimina físicamente
    },
  },
  {
    tableName: "recursos",
    timestamps: true,
    indexes: [{ unique: true, fields: ["matricula"], name: "uq_recursos_matricula" }],
  }
);

module.exports = Recurso;
