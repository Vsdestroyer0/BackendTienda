import sgMail from '@sendgrid/mail';

// Configurar la API key de SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export const sendPasswordResetEmail = async (to, resetLink) => {
  const msg = {
    to,
    from: process.env.FROM_EMAIL, // Ej: 'tu-email@tudominio.com'
    subject: 'Restablece tu contraseña',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Restablece tu contraseña</h2>
        <p style="color: #666;">Haz clic en el botón para restablecer tu contraseña:</p>
        <a href="${resetLink}" 
           style="display: inline-block; padding: 12px 24px; background: #4f46e5; 
                  color: white; text-decoration: none; border-radius: 4px; margin: 16px 0;">
          Restablecer contraseña
        </a>
        <p style="color: #666;">Si no solicitaste esto, puedes ignorar este correo.</p>
        <p style="color: #999; font-size: 12px;"><small>Este enlace expirará en 15 minutos.</small></p>
      </div>
    `,
  };

  try {
    await sgMail.send(msg);
    console.log('Correo de recuperación enviado a:', to);
  } catch (error) {
    console.error('Error enviando correo:', error);
    // En desarrollo, solo logueamos el error pero no detenemos el flujo
    if (process.env.NODE_ENV === 'production') {
      throw new Error('No se pudo enviar el correo de recuperación');
    }
  }
};
