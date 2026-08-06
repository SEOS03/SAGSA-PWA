// Configuración de la conexión a MySQL usando Sequelize (ORM)
require("dotenv").config();
const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: "mysql",
    logging: false, // cambia a console.log si quieres ver las consultas SQL en la terminal
  }
);

module.exports = sequelize;
