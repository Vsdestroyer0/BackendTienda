// Importaciones de paquetes
import { Router } from "express";

// Importaciones internas
import { adjustSkuStock, createProduct } from "../../controllers/inventory/inventoryController.js";
import { VerifyToken, verifyRole } from "../../middleware/authMiddleware.js";

const router = Router();

// POST /api/admini/products
router.post("/products", VerifyToken, verifyRole("admon_inventario"), createProduct);

// PUT /api/admini/products/:sku/stock
// Body: { "ajuste": number }
router.put("/products/:sku/stock", VerifyToken, verifyRole("admon_inventario"), adjustSkuStock);

// Exportación del router creo que ya les quedó claro (espero que si)
export default router;
