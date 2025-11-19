import admin from '../../config/firebaseAdmin.js';
import jwt from 'jsonwebtoken';
import Usuario from '../../models/users/usuario.js';

export const googleAuth = async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: 'idToken requerido' });

    // 1) Verificar idToken de Firebase
    const decoded = await admin.auth().verifyIdToken(idToken);
    const { uid, email, name, picture, email_verified } = decoded;

    // Derivar nombre y apellido del display name de Google
    const [firstName, ...rest] = (name || '').trim().split(' ');
    const lastName = rest.join(' ');

    // 2) Buscar/crear usuario local
    let user = await Usuario.findOne({ email });
    if (!user) {
      user = new Usuario({
        email,
        nombre: firstName || 'Usuario',
        // Asegurar que apellido no sea vacío porque el schema lo requiere
        apellido: lastName || 'Google',
        role: 'user',
        emailVerified: email_verified ?? true
        // No guardamos password ni campos ajenos al schema
      });
      await user.save();
    }

    // 3) Emitir JWT propio y cookie httpOnly
    const token = jwt.sign(
      { id: user._id.toString(), email: user.email, role: user.role, nombre: user.nombre },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
      maxAge: 12 * 60 * 60 * 1000,
    });

    return res.json({
      _id: user._id,
      nombre: user.nombre,
      apellido: user.apellido,
      email: user.email,
      role: user.role,
      historial_compras: [],
    });
  } catch (e) {
    console.error('googleAuth error', e);
    return res.status(401).json({ error: 'Token inválido' });
  }
};