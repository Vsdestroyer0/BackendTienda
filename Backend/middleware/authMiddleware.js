// Importaciones de paquetes
import jwt from "jsonwebtoken";
import Usuario from "../models/users/usuario.js"; 

// Configuración de la clave secreta para el token
const secretKey = process.env.JWT_SECRET;

// Función para verificar el token
// req: solicitud
// res: respuesta
// next: siguiente
export const VerifyToken = async (req, res, next) => {
    // El token sirve para validar que el usuario esta autenticado
    // req.cookies.token es el token que se envia en la solicitud
 const token =
    req.cookies?.token ||
    req.header("Authorization")?.replace("Bearer ", "");

    // Si no se encuentra el token se retorna un error
    // El 401 es un error de autenticación
    if (!token) {
        console.warn("No se encontro token");
        return res.status(401).json({success: false, message: "No se encontro token"});
    }
    
    // Intentar verificar el token
    try{
        // Decodificar el token y obtener el usuario
        const decoded = jwt.verify(token, secretKey);
        
        // Consulta a BD para obtener email/role actualizados
        const user = await Usuario.findById(decoded.id).select("_id email role nombre");
        if (!user) {
        return res.status(401).json({ success: false, message: "Usuario no encontrado" });
        }

        req.user = {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        nombre: user.nombre
        };
        req.userId = req.user.id;

        return next();
        
    } catch (error) {
        console.error("Error al verificar el token:", error);
  return res.status(401).json({ success: false, message: "Token inválido o expirado" });
    }
};

export const verifyRole = (...role) => (req, res, next) => {
    if (!req.user || !role.includes(req.user.role)){
        // Se usa 403 ya que no posee los permisos 
        return res.status(403).json({success: false, message: "No tienes permisos"})
    }
    // Si el usuario posee los permisos se ejecuta la siguiente funcion
    return next();
}