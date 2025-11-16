// Importaciones de paquetes
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { randomBytes, createHash } from "crypto";

// Servicios
import { sendVerificationEmail } from "../../services/mailService.js";

// Importaciones de modelos
import Usuario from "../../models/users/usuario.js";
const secretKey = process.env.JWT_SECRET;

// Configuración de bcrypt
const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS);

// Función para registrar un usuario
// req: solicitud
// res: respuesta
export const registrar = async (req, res) => {
    try {
        const { email, password, nombre, apellido } = req.body;
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
    /*
    if (!user.emailVerified) {
        return res.status(403).json({ error: "Cuenta no verificada. Revisa tu correo o solicita reenvío." });    
    }
    */
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
        maxAge: 12 * 60 * 60 * 1000
    });

    // Ya jaló el login :D
    res.json({ token });
};

// Obtener sesion
export const getSession = (req, res) => {
    if (!req.user){
        return res.status(401).json({ error: "No hay sesión" });
    }
    const { id, email, role, nombre } = req.user;
    // historial_compras no está modelado aún; se devuelve arreglo vacío por ahora
    res.json({ id, email, role, nombre, historial_compras: [] });
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

// Reenviar verificación
export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email requerido" });

    const user = await Usuario.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: "Usuario no encontrado" });
    if (user.emailVerified) return res.status(200).json({ message: "Correo ya verificado" });

    // Rate limit básico: si faltan >2 minutos para expirar, no reemitir
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
    /*
    const base = process.env.APP_URL_LOCAL || process.env.APP_URL_PRODUCTION || "http://localhost:5173";
    const verifyUrl = `${base}/verify?token=${rawToken}&email=${encodeURIComponent(email)}`;
    try {
      await sendVerificationEmail(email, verifyUrl);
    } catch (mailErr) {
      console.error("No se pudo enviar email de verificación:", mailErr);
    }
    */
    return res.json({ message: "Correo de verificación reenviado" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "No se pudo reenviar verificación" });
  }
};