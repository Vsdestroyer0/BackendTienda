// Importaciones de paquetes fuera del proyecto
import { Router } from "express";

// Importaciones de paquetes dentro del proyecto
import { registrar, loginUser, getSession, logoutUser } from "../../controllers/users/authController.js";
import { VerifyToken } from "../../middleware/authMiddleware.js";

// Creación del router
// Router es un objeto que contiene todas las rutas de la app
const router = Router();

// Registro (siempre crea usuarios con role "user")
// body: { email, password, nombre, apellido }
router.post("/register", registrar);

// Login (devuelve cookie httpOnly "token")
// body: { email, password }
router.post("/login", loginUser);

// Obtener sesión actual (requiere token válido)
// body: {}
router.get("/me", VerifyToken, getSession);

// Logout (limpia cookie "token")
// body: {}
router.delete("/logout", logoutUser);

// exportacion del router
export default router;