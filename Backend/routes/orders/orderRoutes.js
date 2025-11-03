// Importaciones de paquetes fuera del proyecto
import { Router } from "express";

// Importaciones de paquetes dentro del proyecto
import { checkoutCompra } from "../../controllers/orders/orderController.js";
import { VerifyToken, verifyRole } from "../../middleware/authMiddleware.js";

// Creación del router
// router es un objeto que contiene todas las rutas de la app
const router = Router();

// Checkout (requiere validación)
// body: {"items": [{"sku": "string", "cantidad": number}],
//        "metodo_pago": "Tarjeta", "direccion_envio": "string"}
router.post("/checkout", VerifyToken, verifyRole("user", "cajero"), checkoutCompra);

// Exportación del router
export default router;