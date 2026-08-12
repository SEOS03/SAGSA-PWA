const nodemailer = require("nodemailer");

// Envío de correo vía Gmail SMTP. EMAIL_USER/EMAIL_PASS deben ser el correo
// de Gmail y una "contraseña de aplicación" (no la contraseña normal de la cuenta).
const transportador = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function enviarCorreoBienvenida(correo, nombre, passwordTemporal) {
  await transportador.sendMail({
    from: `"Sagsa Academy" <${process.env.EMAIL_USER}>`,
    to: correo,
    subject: "Acceso al Sistema de Control de Vuelos — Sagsa Academy",
    html: `
      <p>Hola ${nombre},</p>
      <p>Se creó tu cuenta en el Sistema de Control de Vuelos de Sagsa Academy.</p>
      <p>
        <strong>Correo de acceso:</strong> ${correo}<br/>
        <strong>Contraseña temporal:</strong> ${passwordTemporal}
      </p>
      <p>Por seguridad, el sistema te pedirá cambiarla la primera vez que inicies sesión.</p>
    `,
  });
}

async function enviarCorreoRecuperacion(correo, nombre, enlace) {
  await transportador.sendMail({
    from: `"Sagsa Academy" <${process.env.EMAIL_USER}>`,
    to: correo,
    subject: "Recuperación de contraseña — Sagsa Academy",
    html: `
      <p>Hola ${nombre},</p>
      <p>Solicitaste restablecer tu contraseña en el Sistema de Control de Vuelos de Sagsa Academy.</p>
      <p><a href="${enlace}">Haz clic aquí para crear una nueva contraseña</a></p>
      <p>Este enlace vence en 1 hora. Si no solicitaste este cambio, puedes ignorar este correo.</p>
    `,
  });
}

module.exports = { enviarCorreoBienvenida, enviarCorreoRecuperacion };
