import { resend } from "../lib/resend.js";

async function sendConfirmationEmail(to, username, rawToken) {
  try {
    const data = await resend.emails.send({
      from: "V22 <noreply@v22.lat>",
      to,
      subject: "Bienvenido a V22 🎉",
      html: `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <title>Bienvenido a V22</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        background-color: #f5f5f5;
        margin: 0;
        padding: 20px;
        color: #333;
      }
      .container {
        max-width: 600px;
        margin: auto;
        background-color: #ffffff;
        padding: 30px;
        border-radius: 10px;
        box-shadow: 0 0 10px rgba(0,0,0,0.05);
      }
      h2 {
        color: #751B80;
      }
      .button {
        display: inline-block;
        margin-top: 20px;
        padding: 12px 24px;
        background-color: #751B80;
        color: white;
        text-decoration: none;
        border-radius: 25px;
        font-weight: bold;
        font-size: 16px;
      }
      .footer {
        margin-top: 30px;
        font-size: 12px;
        color: #777;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h2>Bienvenido a V22 🎉</h2>
      <p>Hola <strong>${username}</strong>,</p>
      <p>¡Gracias por registrarte en <strong>V22</strong>! Ya estás a un paso de comenzar a acortar tus enlaces de manera rápida y eficiente.</p>
      <p>Por favor, confirma tu cuenta haciendo clic en el siguiente botón:</p>
      <a
        href="http://localhost:5173/verify-email?token=${rawToken}"
        class="button"
        target="_blank"
        rel="noopener noreferrer"
      >
        VERIFICAR MI CUENTA
      </a>
      <p>Este enlace caduca en unos minutos por seguridad.</p>
      <p class="footer">
        Si no creaste esta cuenta, puedes ignorar este correo.<br />
        ¿Necesitas ayuda? Contáctanos a <a href="mailto:help@v22.lat">help@v22.lat</a><br />
        — El equipo de V22
      </p>
    </div>
  </body>
</html>
`,
    });
    console.log(data, "se llamo a la funcion");
    return data;
  } catch (error) {
    console.error("Error al enviar correo:", error);
    throw error;
  }
}

export default sendConfirmationEmail;
