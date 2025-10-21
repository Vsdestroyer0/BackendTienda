// Importaciones
import nodemailer from "nodemailer";

export async function sendVerificationEmail(to, verifyUrl) {
  const isSecure = process.env.SMTP_PORT === "465";
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: isSecure,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });

  const info = await transporter.sendMail({
    from: `"Tienda" <${process.env.FROM_EMAIL}>`,
    to,
    subject: "Verifica tu cuenta",
    html: `<p>Gracias por registrarte.</p>
           <p>Haz clic para verificar tu cuenta:</p>
           <p><a href="${verifyUrl}">${verifyUrl}</a></p>
           <p>Si tú no solicitaste esto, ignora este correo.</p>`
  });

  return info.messageId;
}