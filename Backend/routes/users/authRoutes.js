// Importaciones de paquetes fuera del proyecto
import { Router } from "express";

// Importaciones de paquetes dentro del proyecto
import { registrar, loginUser, getSession, logoutUser, verifyEmail, resendVerification, setupSecurityQuestions, verifySecurityAnswers, getSecurityCatalog } from "../../controllers/users/authController.js";
import { VerifyToken } from "../../middleware/authMiddleware.js";
import { googleAuth } from '../../controllers/users/googleAuthController.js';


// Creación del router
// Router es un objeto que contiene todas las rutas de la app
const router = Router();

// Registro (siempre crea usuarios con role "user")
// body: { email, password, nombre, apellido }
router.post("/register", registrar);

// Login (devuelve cookie httpOnly "token")
// body: { email, password }
// respuesta post /login: { token }
router.post("/login", loginUser);

// Obtener sesión actual (requiere token válido)
// body: {}
router.get("/me", VerifyToken, getSession);

// Logout (limpia cookie "token")
// body: {}
router.delete("/logout", logoutUser);

// Verificación de correo (double opt-in)
// body: { email, token }
router.post("/verify", verifyEmail);

// Reenviar verificación
// body: { email }
router.post("/resend-verification", resendVerification);

// Configurar preguntas de seguridad (requiere sesión local)
// body: { questions: [{ questionId, answer }, ...] }
router.post("/security/setup", VerifyToken, setupSecurityQuestions);

// Verificar respuestas de seguridad (recuperación)
// body: { email, answers: [{ questionId, answer }, ...] }
router.post("/security/verify", verifySecurityAnswers);

// Catálogo de preguntas de seguridad
// GET /auth/security/catalog -> { catalog: [{ id, label }, ...] }
router.get("/security/catalog", getSecurityCatalog);

// Autenticación con Google
// body: { idToken }
router.post('/google', googleAuth);

// exportacion del router
export default router;