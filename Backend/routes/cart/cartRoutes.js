// Importaciones de paquetes
import { Router } from "express";

// Middlewares
import { VerifyToken, verifyRole } from "../../middleware/authMiddleware.js";

// Controladores
import { getCart, addToCart, updateCartItem, removeFromCart } from "../../controllers/cart/cartController.js";

const router = Router();

// GET /api/cart
router.get("/", VerifyToken, verifyRole("user"), getCart);

// POST /api/cart
router.post("/", VerifyToken, verifyRole("user"), addToCart);

// PUT /api/cart/:sku
router.put("/:sku/:size", VerifyToken, verifyRole("user"), updateCartItem);

// DELETE /api/cart/:sku
router.delete("/:sku/:size", VerifyToken, verifyRole("user"), removeFromCart);

export default router;
