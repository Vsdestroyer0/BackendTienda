// Importaciones
import { Router } from "express";
import { VerifyToken, verifyRole } from "../../middleware/authMiddleware.js";
import {
  createCashClosure,
  getMyPosSales,
  createPosRefund,
} from "../../controllers/pos/posController.js";

const router = Router();

// POST /api/pos/cierre-caja (solo cajero)
router.post("/cierre-caja", VerifyToken, verifyRole("cajero"), createCashClosure);

// GET /api/pos/my-sales (historial de ventas del cajero)
router.get("/my-sales", VerifyToken, verifyRole("cajero"), getMyPosSales);

// POST /api/pos/refunds (registrar reembolsos POS)
router.post("/refunds", VerifyToken, verifyRole("cajero"), createPosRefund);

export default router;
