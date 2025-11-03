// Importaciones
import { Router } from "express";
import { VerifyToken, verifyRole } from "../../middleware/authMiddleware.js";
import { createInternalUser, deleteInternalUser } from "../../controllers/admin/adminUsersController.js";

const router = Router();

// POST /api/admin/users
router.post("/users", VerifyToken, verifyRole("admon_roles"), createInternalUser);

// DELETE /api/admin/users/:id
router.delete("/users/:id", VerifyToken, verifyRole("admon_roles"), deleteInternalUser);

export default router;
