// Importaciones de paquetes fuera del proyecto
import { Router } from "express";

// Importaciones de paquetes dentro del proyecto
import { registrar, loginUser, getSession, logoutUser, verifyEmail, resendVerification, requestPasswordReset, resetPasswordWithToken } from "../../controllers/users/authController.js";
import { VerifyToken, } from "../../middleware/authMiddleware.js";
import { googleAuth } from '../../controllers/users/googleAuthController.js';
import { changePassword, updateProfile } from "../../controllers/users/authController.js";

// Creación del router
const router = Router();

// Registro (siempre crea usuarios con role "user")
router.post("/register", registrar);

// Login (devuelve cookie httpOnly "token")
router.post("/login", loginUser);

// Obtener sesión actual (requiere token válido)
router.get("/me", VerifyToken, getSession);

// Logout (limpia cookie "token")
router.delete("/logout", logoutUser);

// Verificación de correo (double opt-in)
router.post("/verify", verifyEmail);

// Reenviar verificación
router.post("/resend-verification", resendVerification);

// Autenticación con Google
router.post('/google', googleAuth);

// Rutas de recuperación de contraseña por email
router.post('/forgot-password', requestPasswordReset);
router.post('/reset-password', resetPasswordWithToken);

//Cambio de contraseña
router.put("/password", VerifyToken, changePassword);
//Editar Perfil
// Ruta para actualizar perfil
router.put("/profile",  VerifyToken, updateProfile);

// exportacion del router
export default router;