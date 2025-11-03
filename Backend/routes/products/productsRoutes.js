// Importaciones de paquetes
import { Router } from "express";

// Importaciones internas
import { listProducts, getProductById } from "../../controllers/products/productsController.js";

const router = Router();

// GET /api/products
router.get("/", listProducts);

// GET /api/products/:productId
router.get("/:productId", getProductById);

export default router;
