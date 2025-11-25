import { Router } from "express";
import { VerifyToken, verifyRole } from "../../middleware/authMiddleware.js";
import { getCart, addToCart, updateCartItem, removeFromCart } from "../../controllers/cart/cartController.js";

const router = Router();

// Todas protegidas para usuario
router.use(VerifyToken, verifyRole("user"));

router.get("/", getCart);
router.post("/", addToCart);
router.put("/:sku/:size", updateCartItem);    // Recibe SKU y Talla en URL
router.delete("/:sku/:size", removeFromCart); // Recibe SKU y Talla en URL

export default router;