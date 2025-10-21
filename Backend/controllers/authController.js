// Importaciones de paquetes
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

// Importaciones de modelos
import Usuario from "../models/usuario.js";
const secretKey = process.env.JWT_SECRET;

// Función para registrar un usuario
// req: solicitud
// res: respuesta
export const registrar = async (req, res) => {
    const { email, password } = req.body;
    // Validar que el email y la contraseña no estén vacíos
    if (!email || !password) {
        return res.json({ success: false, message: "Faltan datos" });
    }

    const exists = await Usuario.findOne({ email });
    if (exists) {
        return res.json({ success: false, message: "El usuario ya existe" });
    }

    // Hashear la contraseña, 10 es el numero de veces que se va a hashear
    const hash = await bcrypt.hash(password, 10);
    const newUser = new Usuario({ email, password: hash });
    await newUser.save();
    res.json({ success: true, message: "Usuario registrado" });
};

// Función para iniciar sesión
// req: solicitud
// res: respuesta
export const loginUser = async (req, res) => {
    const { email, password } = req.body;

    // Validar que el email y la contraseña no estén vacíos
    if (!email || !password) {
        return res.json({ success: false, message: "Faltan datos" });
    }

    const user = await Usuario.findOne({ email });
    if (!user) {
        return res.json({ success: false, message: "Usuario no encontrado" });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
        return res.json({ success: false, message: "Contraseña incorrecta" });
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
        sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
        // maxAge es la fecha de expiración del token y aqui son 12 horas
        maxAge: 12 * 60 * 60 * 1000
    });

    // Ya jaló el login :D
    res.json({ success: true, email: user.email, role: user.role });
};

// Obtener sesion
export const getSession = (req, res) => {
    if (!req.user){
        return res.json({ success: false, message: "No hay sesion" });
    }
    res.json({ user: req.user });
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
        return res.json({ success: true, message: "Sesión cerrada" });
    } catch (e) {
        return res.status(500).json({ success: false, message: "No se pudo cerrar la sesión" });
    }
};