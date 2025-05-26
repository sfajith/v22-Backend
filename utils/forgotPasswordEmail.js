import { resend } from "../lib/resend.js";

async function forgotPasswordEmail(to, forgotToken) {
  try {
    const data = await resend.emails.send({
      from: "V22 <noreply@v22.lat>",
      to,
      subject: "Restablezca su contraseña de V22",
      html: `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <title>Restablece tu contraseña</title>
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
        background: #fff;
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
      <h2>¿Olvidaste tu contraseña?</h2>
      <p>Hola,</p>
      <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en <strong>V22</strong>.</p>
      <p>Haz clic en el siguiente botón para continuar con el proceso de restablecimiento:</p>
      <a
        href="http://localhost:5173/reset-password?token=${forgotToken}"
        class="button"
        target="_blank"
        rel="noopener noreferrer"
      >
        RESTABLECER MI CONTRASEÑA
      </a>
      <p>Si no hiciste esta solicitud, puedes ignorar este correo. Tu contraseña seguirá siendo la misma.</p>
      <p class="footer">
        ¿Necesitas ayuda? Contáctanos a <a href="mailto:help@v22.lat">help@v22.lat</a><br />
        — El equipo de V22
      </p>
    </div>
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

export default forgotPasswordEmail;
