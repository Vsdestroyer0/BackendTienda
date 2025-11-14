// Importaciones de paquetes
import { Router } from "express";

// Importaciones internas
import { VerifyToken, verifyRole } from "../../middleware/authMiddleware.js";
import { getCloudinarySignature, createProductV2, getInventoryProducts } from "../../controllers/inventory/inventoryController.js";

const router = Router();

//este es para la tabla de productos para el admin
router.get("/products", VerifyToken, verifyRole("admon_inventario"), getInventoryProducts);

//obtener firma de cloudinary
router.post("/upload-signature", VerifyToken, verifyRole("admon_inventario"), getCloudinarySignature);

//endpoint para crear productos
router.post("/products-v2", VerifyToken, verifyRole("admon_inventario"), createProductV2);



// Exportación del router creo que ya les quedó claro (espero que si)
export default router;
