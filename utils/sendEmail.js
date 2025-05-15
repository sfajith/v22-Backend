import { resend } from "../lib/resend.js";

async function sendConfirmationEmail(to, username, rawToken) {
  try {
    const data = await resend.emails.send({
      from: "V22 <noreply@v22.lat>",
      to,
      subject: "Bienvenido a V22 🎉",
      html: `  <!DOCTYPE html>
  <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Bienvenido a V22</title>
    </head>
    <body>
      <p>Hola <strong>${username}</strong>, gracias por registrarte en V22.</p>
      <p>¡Empieza a acortar tus enlaces ya!</p>
      <p>VERIFICA TU CUENTA TOCA EL ENLACE</p>
      <p>http://localhost:5173/verify-email?token=${rawToken}</p>
    </body>
  </html>`,
    });
    console.log(data, "se llamo a la funcion");
    return data;
  } catch (error) {
    console.error("Error al enviar correo:", error);
    throw error;
  }
}

export default sendConfirmationEmail;
