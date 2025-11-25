// Importaciones de paquetes
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { randomBytes, createHash } from "crypto";

// Servicios
import { sendVerificationEmail } from "../../services/mailService.js";

// Importaciones de modelos
import Usuario from "../../models/users/usuario.js";
import mongoose from "mongoose";
const secretKey = process.env.JWT_SECRET;

// Configuración de bcrypt
const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS);

// Función para registrar un usuario
// req: solicitud
// res: respuesta
export const registrar = async (req, res) => {
  try {
    const { email, password, nombre, apellido, securityQuestions } = req.body;

    // Validar que el email y la contraseña no estén vacíos
    if (!email || !password || !nombre) {
      return res.status(400).json({ error: "Faltan datos" });
    }

    // Bloquear role en el body para que no se pueda asignar roles elevados
    if (req.body.role && req.body.role !== "user") {
      return res.status(400).json({ error: "No puedes asignar roles elevados" });
    }

    const exists = await Usuario.findOne({ email });
    if (exists) {
      return res.status(409).json({ error: "El usuario ya existe" });
    }

    // Hashear la contraseña
    const hash = await bcrypt.hash(password, saltRounds);

    // Crear usuario base (no verificado)
    const newUser = new Usuario({
      email,
      password: hash,
      nombre,
      apellido: apellido && typeof apellido === "string" && apellido.trim().length > 0 ? apellido : "N/A",
      role: "user",
      emailVerified: false
    });

    // Opcional: configurar preguntas de seguridad si vienen en el registro
    if (Array.isArray(securityQuestions) && securityQuestions.length >= 2 && securityQuestions.length <= 3) {
      const secured = [];
      for (const q of securityQuestions) {
        const { questionId, answer } = q || {};
        if (!questionId || typeof answer !== "string" || !answer.trim()) {
          return res.status(400).json({ error: "Formato inválido de preguntas" });
        }
        const normalize = (s) => (s || "").normalize("NFKD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim().replace(/\s+/g, " ");
        const salt = randomBytes(16).toString("hex");
        const toHash = `${normalize(answer)}:${salt}`;
        const answerHash = await bcrypt.hash(toHash, saltRounds);
        secured.push({ questionId, answerHash, salt });
      }
      newUser.security = { enabled: true, questions: secured };
    }

    // Generar token crudo y hash para verificación
    const rawToken = randomBytes(32).toString("hex");
    const tokenHashed = createHash("sha256").update(rawToken).digest("hex");
    const expiresInMs = 15 * 60 * 1000; // 15 minutos
    newUser.verificationToken = {
      tokenHashed,
      tokenExpiry: new Date(Date.now() + expiresInMs)
    };

    await newUser.save();

    // Enviar email de verificación
    const base = process.env.APP_URL_LOCAL || process.env.APP_URL_PRODUCTION || "http://localhost:5173";
    const verifyUrl = `${base}/verify?token=${rawToken}&email=${encodeURIComponent(email)}`;
    try {
      await sendVerificationEmail(email, verifyUrl);
    } catch (mailErr) {
      // No bloquear registro por error de correo, pero informar
      console.error("No se pudo enviar email de verificación:", mailErr);
    }

    return res.status(201).json({ message: "Usuario creado con éxito. Revisa tu correo para verificar tu cuenta.", user_id: newUser._id.toString() });

  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Error registrando usuario" });
  }
};

// Función para iniciar sesión
// req: solicitud
// res: respuesta
export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  // Validar que el email y la contraseña no estén vacíos
  if (!email || !password) {
    return res.status(400).json({ error: "Faltan datos" });
  }

  const user = await Usuario.findOne({ email });
  if (!user) {
    return res.status(401).json({ error: "Credenciales inválidas o usuario no encontrado." });
  }

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    return res.status(401).json({ error: "Credenciales inválidas o usuario no encontrado." });
  }

  if (!user.emailVerified) {
    return res.status(403).json({ error: "Cuenta no verificada. Revisa tu correo o solicita reenvío." });
  }

  // Generar token JWT
  // Los JWT son tokens que se usan para autenticar a los usuarios
  // email: user.email, role: user.role, id: user._id.toString() son los datos que se van a enviar en el token
  // Se usa toString() para convertir el id a string y no tener problemas con el tipo de dato
  const token = jwt.sign({ email: user.email, role: user.role, id: user._id.toString() }, secretKey, { expiresIn: "12h" });

  // Configuración en producción
  res.cookie("token", token, {
    // httpOnly es para que el token solo se envie por http
    httpOnly: true,
    // secure es para que el token solo se envie por https
    secure: process.env.NODE_ENV === "production",
    // sameSite es para que el token solo se envie en la misma pagina
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
    // maxAge es la fecha de expiración del token y aqui son 12 horas
    maxAge: 48 * 60 * 60 * 1000
  });

  // Ya jaló el login :D
  res.json({
    _id: user._id,
    nombre: user.nombre,
    apellido: user.apellido,
    email: user.email,
    role: user.role,
    emailVerified: user.emailVerified,
    security: { enabled: !!(user.security && user.security.enabled) },
    historial_compras: [] //!necesitamos cambiar esto
  });
};

// Obtener sesion
export const getSession = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "No hay sesión" });
  }
  try {
    const user = await Usuario.findById(req.user.id);
    if (!user) {
      return res.status(401).json({ error: "No hay sesión" });
    }
    res.json({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      nombre: user.nombre,
      emailVerified: !!user.emailVerified,
      security: { enabled: !!(user.security && user.security.enabled) },
      historial_compras: [],
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "No se pudo obtener la sesión" });
  }
};

// Cerrar sesión: limpiar cookie de autenticación
export const logoutUser = (req, res) => {
  try {
    // [CONFIGURACIÓN ESTRICTA DE PRODUCCIÓN]
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
    });
    return res.json({ message: "Sesión cerrada correctamente." });
  } catch (e) {
    return res.status(500).json({ error: "No se pudo cerrar la sesión" });
  }
};

// Verificar email (double opt-in)
export const verifyEmail = async (req, res) => {
  try {
    const { email, token } = req.body; // o desde query si prefieres GET
    if (!email || !token) {
      return res.status(400).json({ error: "Datos incompletos" });
    }
    const user = await Usuario.findOne({ email });
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
    if (user.emailVerified) return res.status(200).json({ message: "Correo ya verificado" });

    const now = new Date();
    if (!user.verificationToken || !user.verificationToken.tokenHashed || !user.verificationToken.tokenExpiry) {
      return res.status(400).json({ error: "Token inválido" });
    }
    if (user.verificationToken.tokenExpiry < now) {
      return res.status(400).json({ error: "Token expirado" });
    }

    const providedHash = createHash("sha256").update(token).digest("hex");
    if (providedHash !== user.verificationToken.tokenHashed) {
      return res.status(400).json({ error: "Token inválido" });
    }

    user.emailVerified = true;
    user.verificationToken = undefined;
    await user.save();

    return res.json({ message: "Correo verificado correctamente" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "No se pudo verificar el correo" });
  }
};

export const updateMe = async (req, res) => {
  try {
    const userId = req.user?.id;
    
    // 1. OBTENER SOLO NOMBRE Y APELLIDO
    const { nombre, apellido } = req.body; 

    if (!userId) return res.status(401).json({ error: "No autenticado" });
    
    // 2. VALIDAR SOLO NOMBRE Y APELLIDO
    if (!nombre || !apellido) return res.status(400).json({ error: "Nombre y apellido son campos requeridos" });
    
    // *** SE ELIMINA toda la lógica de validación y unicidad de email ***
    
    const user = await Usuario.findById(userId);
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
    
    // 3. GUARDAR SOLO NOMBRE Y APELLIDO
    user.nombre = nombre;
    user.apellido = apellido; 
    // user.email queda intacto
    
    await user.save();
    
    // 4. RESPONDER SIN EMAIL NI EMAILVERIFIED
    return res.json({
      id: user._id.toString(),
      nombre: user.nombre,
      apellido: user.apellido,
      role: user.role,
      // Los campos de email se excluyen de la respuesta
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "No se pudo actualizar el usuario" });
  }
};

// Reenviar verificación
export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email requerido" });

    const user = await Usuario.findOne({ email });
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
    if (user.emailVerified) return res.status(200).json({ message: "Correo ya verificado" });

    const now = Date.now();
    const remaining = user.verificationToken?.tokenExpiry ? user.verificationToken.tokenExpiry.getTime() - now : 0;
    if (remaining > 2 * 60 * 1000) {
      return res.status(429).json({ error: "Espera antes de solicitar otro correo" });
    }

    const rawToken = randomBytes(32).toString("hex");
    const tokenHashed = createHash("sha256").update(rawToken).digest("hex");
    const expiresInMs = 15 * 60 * 1000;
    user.verificationToken = {
      tokenHashed,
      tokenExpiry: new Date(now + expiresInMs)
    };
    await user.save();

    const base = process.env.APP_URL_LOCAL || process.env.APP_URL_PRODUCTION || "http://localhost:5173";
    const verifyUrl = `${base}/verify?token=${rawToken}&email=${encodeURIComponent(email)}`;
    try {
      await sendVerificationEmail(email, verifyUrl);
    } catch (mailErr) {
      console.error("No se pudo enviar email de verificación:", mailErr);
    }

    return res.json({ message: "Correo de verificación reenviado" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "No se pudo reenviar verificación" });
  }
};

const normalizeAnswer = (s) => (s || "").normalize("NFKD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim().replace(/\s+/g, " ");

export const getSecurityQuestions = async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: "Email requerido" });

    const user = await Usuario.findOne({ email: String(email).toLowerCase() });
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
    if (!user.security?.enabled || !Array.isArray(user.security.questions) || user.security.questions.length === 0) {
      return res.status(400).json({ error: "El usuario no tiene preguntas configuradas" });
    }

    const questionList = user.security.questions.map((q) => ({ questionId: q.questionId }));
    return res.json({ questions: questionList });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "No se pudieron obtener las preguntas" });
  }
};

export const setupSecurityQuestions = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { questions } = req.body;
    if (!userId) return res.status(401).json({ error: "No autenticado" });
    if (!Array.isArray(questions) || questions.length < 2 || questions.length > 3) {
      return res.status(400).json({ error: "Debes enviar 2 o 3 preguntas" });
    }

    const user = await Usuario.findById(userId);
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
    if (user.authProvider === "google") {
      return res.status(400).json({ error: "No aplica para usuarios de Google" });
    }

    const secured = [];
    for (const q of questions) {
      const { questionId, answer } = q || {};
      if (!questionId || typeof answer !== "string" || !answer.trim()) {
        return res.status(400).json({ error: "Formato inválido de preguntas" });
      }
      const salt = randomBytes(16).toString("hex");
      const toHash = `${normalizeAnswer(answer)}:${salt}`;
      const answerHash = await bcrypt.hash(toHash, saltRounds);
      secured.push({ questionId, answerHash, salt });
    }

    user.security = { enabled: true, questions: secured };
    await user.save();
    return res.json({ message: "Preguntas de seguridad configuradas" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "No se pudieron configurar las preguntas" });
  }
};

export const verifySecurityAnswers = async (req, res) => {
  try {
    const { email, answers } = req.body;
    if (!email || !Array.isArray(answers) || answers.length < 2) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

    const user = await Usuario.findOne({ email: String(email).toLowerCase() });
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
    if (!user.security?.enabled || !Array.isArray(user.security.questions) || user.security.questions.length === 0) {
      return res.status(400).json({ error: "El usuario no tiene preguntas configuradas" });
    }

    let correct = 0;
    for (const a of answers) {
      const { questionId, answer } = a || {};
      const stored = user.security.questions.find(q => q.questionId === questionId);
      if (!stored) continue;
      const toCheck = `${normalizeAnswer(answer)}:${stored.salt}`;
      const ok = await bcrypt.compare(toCheck, stored.answerHash);
      if (ok) correct += 1;
    }

    if (correct < Math.min(2, user.security.questions.length)) {
      return res.status(401).json({ error: "Respuestas incorrectas" });
    }

    const rawToken = randomBytes(32).toString("hex");
    const tokenHashed = createHash("sha256").update(rawToken).digest("hex");
    const expiresInMs = 15 * 60 * 1000;
    user.passwordResetToken = {
      tokenHashed,
      tokenExpiry: new Date(Date.now() + expiresInMs)
    };
    await user.save();

    return res.json({ ok: true, resetToken: rawToken });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Error verificando respuestas" });
  }
};

export const getSecurityCatalog = async (req, res) => {
  try {
    // Lee desde la colección 'Preguntas'
    const col = mongoose.connection.collection('Preguntas');
    const docs = await col.find({ active: { $ne: false } }).project({ _id: 0, code: 1, text: 1 }).toArray();
    const catalog = (docs || []).map(d => ({ id: d.code, label: d.text }));
    return res.json({ catalog });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'No se pudo obtener el catálogo de preguntas' });
  }
};

export const resetPasswordWithToken = async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;
    if (!email || !token || !newPassword) {
      return res.status(400).json({ error: "Datos incompletos" });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: "La nueva contraseña debe tener al menos 8 caracteres" });
    }

    const user = await Usuario.findOne({ email });
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
    const storedToken = user.passwordResetToken;
    if (!storedToken?.tokenHashed || !storedToken?.tokenExpiry) {
      return res.status(400).json({ error: "Token inválido" });
    }
    if (storedToken.tokenExpiry < new Date()) {
      return res.status(400).json({ error: "Token expirado" });
    }

    const providedHash = createHash("sha256").update(token).digest("hex");
    if (providedHash !== storedToken.tokenHashed) {
      return res.status(400).json({ error: "Token inválido" });
    }

    const hash = await bcrypt.hash(newPassword, saltRounds);
    user.password = hash;
    user.passwordResetToken = undefined;
    await user.save();

    return res.json({ message: "Contraseña actualizada correctamente" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "No se pudo actualizar la contraseña" });
  }
};