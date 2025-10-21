// Importaciones de paquetes fuera del proyecto
import { Router } from "express";

// Importaciones de paquetes dentro del proyecto
import { registrar, loginUser, getSession, logoutUser } from "../../controllers/authController.js";
import { VerifyToken } from "../../middleware/authMiddleware.js";

// Creación del router
// Router es un objeto que contiene todas las rutas de la app
const router = Router();

// Registro (siempre crea usuarios con role "user")
// body: { email, password, nombre, apellido }
router.post("/api/auth/register", registrar);

// Login (devuelve cookie httpOnly "token")
// body: { email, password }
router.post("/api/auth/login", loginUser);

// Obtener sesión actual (requiere token válido)
// body: {}
router.get("/api/auth/me", VerifyToken, getSession);

// Logout (limpia cookie "token")
// body: {}
router.post("/api/auth/logout", logoutUser);

// exportacion del router
export default router;