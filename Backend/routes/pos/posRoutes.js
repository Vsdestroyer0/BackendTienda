// Importaciones
import { Router } from "express";
import { VerifyToken, verifyRole } from "../../middleware/authMiddleware.js";
import { createCashClosure } from "../../controllers/pos/posController.js";

const router = Router();

// POST /api/pos/cierre-caja (solo cajero)
router.post("/cierre-caja", VerifyToken, verifyRole("cajero"), createCashClosure);

export default router;
