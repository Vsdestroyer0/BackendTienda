// Importaciones
import nodemailer from "nodemailer";

// Función que genera el HTML de verificación
function verificationEmailHtml(verifyUrl) {
  return `
    <div style="font-family: Arial, Helvetica, sans-serif; background: #f9f9f9; padding: 32px;">
      <div style="max-width: 480px; margin: auto; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px #eee; padding: 24px;">
        <h2 style="color: #3a3d42; text-align: center;">¡Gracias por registrarte en Tienda!</h2>
        <p style="font-size: 16px;">Para comenzar a disfrutar tu cuenta, completa la verificación:</p>
        <div style="text-align: center; margin: 32px 0;">
          <a
            href="${verifyUrl}"
            style="display: inline-block; padding: 12px 32px; background: #1572a1; color: #fff; font-size: 18px; border-radius: 4px; text-decoration: none; font-weight: bold;"
            target="_blank"
          >Verificar mi cuenta</a>
        </div>
        <p style="color: #555;">Si tú no solicitaste este registro, simplemente ignora este correo.</p>
        <hr style="margin: 24px 0;">
        <small style="color: #888;">© Tienda ${new Date().getFullYear()} - Todos los derechos reservados.</small>
      </div>
    </div>
  `;
}

export async function sendVerificationEmail(to, verifyUrl) {
  const isSecure = process.env.SMTP_PORT === "465";
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: isSecure,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    tls: {rejectUnauthorized: false}
  });

  const info = await transporter.sendMail({
    from: `"Tienda" <${process.env.FROM_EMAIL}>`,
    to,
    subject: "¡Verifica tu cuenta en Tienda!",
    // Separé el html para mejor legibilidad
    html: verificationEmailHtml(verifyUrl)  
  });

  const ok = await transporter.verify();
  console.log("[SMTP verify]", ok);

  return info.messageId;
}
