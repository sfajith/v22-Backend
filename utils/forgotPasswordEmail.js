import { resend } from "../lib/resend.js";

async function forgotPasswordEmail(to, forgotToken) {
  try {
    const data = await resend.emails.send({
      from: "V22 <noreply@v22.lat>",
      to,
      subject: "Restablezca su contraseña de V22",
      html: `  <!DOCTYPE html>
  <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Hola:</title>
    </head>
    <body>
      <p>Haga clic en el siguiente enlace para restablecer la contraseña de su cuenta de V22</p>
        <a href="http://localhost:5173/reset-password?token=${forgotToken}" target="_blank" rel="noopener noreferrer">
        <button>
        RESTABLECER MI CONTRASEÑA
        </button>
        </a>
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
