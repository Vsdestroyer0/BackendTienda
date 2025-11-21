// Importaciones
import { Router } from "express";
import { VerifyToken, verifyRole } from "../../middleware/authMiddleware.js";
import { createInternalUser, deleteInternalUser, listInternalUsers } from "../../controllers/admin/adminUsersController.js";

const router = Router();

// POST /api/admin/users
router.post("/users", VerifyToken, verifyRole("admon_roles"), createInternalUser);

// DELETE /api/admin/users/:id
router.delete("/users/:id", VerifyToken, verifyRole("admon_roles"), deleteInternalUser);

// GET /api/admin/users - Obtener lista de empleados
router.get("/users", VerifyToken, verifyRole("admon_roles"), listInternalUsers);

export default router;
