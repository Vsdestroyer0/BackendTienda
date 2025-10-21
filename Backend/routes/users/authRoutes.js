// Importaciones de paquetes fuera del proyecto
import { Router } from "express";

// Importaciones de paquetes dentro del proyecto
import { registrar, loginUser, getSession, logoutUser } from "../../controllers/authController.js";
import { VerifyToken } from "../../middleware/authMiddleware.js";

// Creación del router
// Router es un objeto que contiene todas las rutas de la app
const router = Router();

// Registro (siempre crea usuarios con role "user")
router.post("/register", registrar);

// Login (devuelve cookie httpOnly "token")
router.post("/login", loginUser);

// Obtener sesión actual (requiere token válido)
router.get("/session", VerifyToken, getSession);

// Logout (limpia cookie "token")
router.post("/logout", logoutUser);

export default router;