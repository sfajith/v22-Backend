import { resend } from "../lib/resend.js";

async function passwordWasChanged(to, username) {
  try {
    const data = await resend.emails.send({
      from: "V22 <noreply@v22.lat>",
      to,
      subject: "Tu contraseña ha sido cambiada correctamente",
      html: `  <!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Alerta de cambio de contraseña</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background-color: #f9f9f9;
      margin: 0;
      padding: 20px;
      color: #333;
    }
    .container {
      max-width: 600px;
      background-color: #ffffff;
      padding: 30px;
      margin: 0 auto;
      border-radius: 10px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    }
    h2 {
      color: #751B80;
    }
    .button {
      display: inline-block;
      margin-top: 20px;
      padding: 12px 20px;
      background-color: #751B80;
      color: #ffffff;
      text-decoration: none;
      border-radius: 20px;
      font-weight: bold;
    }
    .footer {
      font-size: 12px;
      color: #777;
      margin-top: 30px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h2>Tu contraseña ha sido cambiada</h2>
    <p>Hola ${username},</p>

    <p>Queremos informarte que tu contraseña fue cambiada exitosamente.</p>

    <p>Si realizaste este cambio, no necesitas hacer nada más. ¡Gracias por mantener tu cuenta segura!</p>

    <p>Si <strong>no reconoces</strong> este cambio, es posible que alguien más esté intentando acceder a tu cuenta.</p>

    <p>Puedes restablecer tu contraseña de inmediato desde el siguiente botón:</p>

   <a href="http://localhost:5173/forgot-password"
   style="display: inline-block; margin-top: 20px; padding: 12px 20px; background-color: #751B80; color: #ffffff; text-decoration: none; border-radius: 20px; font-weight: bold; font-family: Arial, sans-serif;">
   Restablecer contraseña
</a>

    <p class="footer">
      Si tienes alguna duda o necesitas ayuda, puedes contactarnos a help@v22.lat cuanto antes.
      <br><br>
      — El equipo de V22 acortador de enlaces.
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

export default passwordWasChanged;
