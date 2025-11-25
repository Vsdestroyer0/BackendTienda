// Importaciones de paquetes
import jwt from "jsonwebtoken";
import Usuario from "../models/users/usuario.js";

// Configuración de la clave secreta para el token
const secretKey = process.env.JWT_SECRET;

// Función para verificar el token
// req: solicitud
// res: respuesta
// next: siguiente
export const VerifyToken = (req, res, next) => {
    try {
        // 1. Obtener token desde Authorization o cookie httpOnly
        const authHeader = req.headers.authorization || req.headers.Authorization;
        let token = null;

        if (authHeader?.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        } else if (req.cookies?.token) {
            // Soportar el flujo donde el backend pone el JWT en una cookie httpOnly
            token = req.cookies.token;
        }

        // 2. Si no hay token en ninguna fuente, devolvemos 401
        if (!token) {
            return res.status(401).json({
                message: 'Acceso denegado. No se proporcionó token.'
            });
        }

        // 3. Verificar el token
        const decoded = jwt.verify(token, secretKey);

        // 4. Inyectar usuario en la request y continuar
        req.user = decoded;
        next();

    } catch (error) {
        // Token inválido o expirado
        return res.status(403).json({
            message: 'Token inválido o expirado.',
            error: error.message
        });
    }
};

export const verifyRole = (...role) => (req, res, next) => {
    if (!req.user || !role.includes(req.user.role)) {
        // Se usa 403 ya que no posee los permisos 
        return res.status(403).json({ success: false, message: "No tienes permisos" })
    }
    // Si el usuario posee los permisos se ejecuta la siguiente funcion
    return next();
}