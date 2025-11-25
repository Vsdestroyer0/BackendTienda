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
        // 1. Obtener el header de autorización
        const authHeader = req.headers.authorization || req.headers.Authorization;

        // 2. PRIMER FILTRO: ¿Existe el header?
        // Si no hay header o no empieza con "Bearer ", es un visitante.
        if (!authHeader?.startsWith('Bearer ')) {
            // Retornamos 401 (Unauthorized) limpiamente.
            // No hacemos console.error aquí porque es un flujo "normal".
            return res.status(401).json({
                message: 'Acceso denegado. No se proporcionó token.'
            });
        }

        // 3. Extraer el token (quitar la palabra "Bearer ")
        const token = authHeader.split(' ')[1];

        // 4. SEGUNDO FILTRO: Verificar el token
        // jwt.verify lanzará un error si el token está manipulado o expirado,
        // por eso lo envolvemos en este bloque try/catch.
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 5. Inyectar usuario en la request y continuar
        req.user = decoded;
        next();

    } catch (error) {
        // Aquí caen errores como: Token expirado, Token inválido, Firma falsa.

        // Opcional: Solo loguear si es un error raro, no si es expiración normal.
        // console.log("Error de auth:", error.message); 

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