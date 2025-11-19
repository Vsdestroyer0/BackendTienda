// Importaciones de paquetes
import { Router } from "express";

// Importaciones internas
import { VerifyToken, verifyRole } from "../../middleware/authMiddleware.js";
import { getCloudinarySignature, createProductV2, getInventoryProducts, getInventoryStats, adjustStock } from "../../controllers/inventory/inventoryController.js";

const router = Router();

//ruta para los kpis, o sea datos como numero de productos, inventario bajo, etc
router.get("/stats", VerifyToken, verifyRole("admon_inventario"), getInventoryStats);

//este es para la tabla de productos para el admin
router.get("/products", VerifyToken, verifyRole("admon_inventario"), getInventoryProducts);

//obtener firma de cloudinary
router.get("/upload-signature", VerifyToken, verifyRole("admon_inventario"), getCloudinarySignature);

//endpoint para crear productos
router.post("/products-v2", VerifyToken, verifyRole("admon_inventario"), createProductV2);

//endpoint para ajustar stock
router.patch("/stock/adjust", VerifyToken, verifyRole("admon_inventario"), adjustStock);

// Exportación del router creo que ya les quedó claro (espero que si)
export default router;
