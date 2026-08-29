const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// Flujo de aprobación: cambios propuestos por un administrador regular sobre
// un recurso, pendientes de revisión por el super administrador antes de
// aplicarse en firme.
const SolicitudCambio = sequelize.define(
  "SolicitudCambio",
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
    tipoAccion: {
      type: DataTypes.ENUM(
        "cambiar_estado",
        "registrar_mantenimiento",
        "finalizar_mantenimiento",
        "actualizar_horas"
      ),
      allowNull: false,
    },
    datosPropuestos: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    estado: {
      type: DataTypes.ENUM("pendiente", "aprobada", "rechazada"),
      allowNull: false,
      defaultValue: "pendiente",
    },
    solicitadoPor: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    revisadoPor: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    motivoRechazo: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    fechaSolicitud: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    fechaResolucion: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "solicitudes_cambio",
    timestamps: true,
  }
);

module.exports = SolicitudCambio;
