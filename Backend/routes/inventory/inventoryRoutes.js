// Importaciones de paquetes
import { Router } from "express";

// Importaciones internas
import { adjustSkuStock, createProduct } from "../../controllers/inventory/inventoryController.js";
import { VerifyToken, verifyRole } from "../../middleware/authMiddleware.js";
import { getCloudinarySignature, createProductV2 } from "../../controllers/inventory/inventoryController.js";

const router = Router();

//obtener firma de cloudinary
router.post("/upload-signature", VerifyToken, verifyRole("admon_inventario"), getCloudinarySignature);

//endpoint para crear productos
router.post("/products-v2", VerifyToken, verifyRole("admon_inventario"), createProductV2);

// POST /api/admini/products
router.post("/products", VerifyToken, verifyRole("admon_inventario"), createProduct);

// PUT /api/admini/products/:sku/stock
// Body: { "ajuste": number }
router.put("/products/:sku/stock", VerifyToken, verifyRole("admon_inventario"), adjustSkuStock);

// Exportación del router creo que ya les quedó claro (espero que si)
export default router;
