const crypto = require("crypto");

// Se excluyen caracteres ambiguos (0/O, 1/l/I) porque la contraseña
// temporal se envía por correo y el usuario la debe transcribir a mano.
const CARACTERES = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

function generarPasswordTemporal(longitud = 10) {
  let password = "";
  for (let i = 0; i < longitud; i++) {
    const indice = crypto.randomInt(0, CARACTERES.length);
    password += CARACTERES[indice];
  }
  return password;
}

module.exports = { generarPasswordTemporal };
