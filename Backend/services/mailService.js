import sgMail from '@sendgrid/mail';

// Inicializa SendGrid con tu API Key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// HTML para el email
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
  const msg = {
    to,
    from: process.env.FROM_EMAIL, // Debe ser un email verificado en SendGrid
    subject: '¡Verifica tu cuenta en Tienda!',
    html: verificationEmailHtml(verifyUrl),
  };

  try {
    const response = await sgMail.send(msg);
    console.log('[SendGrid response]', response);
    return response[0].headers['x-message-id'] || null;
  } catch (error) {
    console.error('[SendGrid Error]', error);
    throw error;
  }
}
