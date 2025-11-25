// Importaciones de paquetes fuera del proyecto
import { Router } from "express";

// Importaciones de paquetes dentro del proyecto
import { checkoutCompra, checkoutPosVenta, listUserOrders, getUserOrderById } from "../../controllers/orders/orderController.js";
import { VerifyToken, verifyRole } from "../../middleware/authMiddleware.js";

// Creación del router
// router es un objeto que contiene todas las rutas de la app
const router = Router();

// Checkout web / general (requiere validación)
// body: {"items": [{"sku": "string", "size": "string", "cantidad": number}],
//        "metodo_pago": "Tarjeta", "direccion_envio": "string"}
router.post("/checkout", VerifyToken, verifyRole("user", "cajero"), checkoutCompra);

// Checkout POS (cajero en tienda)
// body: {"items": [{"sku": "string", "cantidad": number}],
//        "metodo_pago": "Efectivo" | "Tarjeta", "origen_venta"?: "VENTA_POS"}
router.post("/checkout-pos", VerifyToken, verifyRole("cajero"), checkoutPosVenta);

// Historial de órdenes del usuario (Cliente)
router.get("/", VerifyToken, verifyRole("user"), listUserOrders);

// Detalle de orden del usuario (Cliente)
router.get("/:orderId", VerifyToken, verifyRole("user"), getUserOrderById);

// Exportación del router
export default router;