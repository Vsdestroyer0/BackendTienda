// Importaciones de paquetes fuera del proyecto
import { Router } from "express";

// Importaciones de paquetes dentro del proyecto
import { checkoutCompra } from "../../controllers/orders/orderController.js";
import { VerifyToken } from "../../middleware/authMiddleware.js";

// Creación del router
// router es un objeto que contiene todas las rutas de la app
const router = Router();

// Role guard simple: permite Cliente (user) o Cajero (cajero)
const allowRoles = new Set(["user", "cajero"]);
const roleGuard = (req, res, next) => {
  const role = req.user?.role;
  if (!role || !allowRoles.has(role)) {
    return res.status(403).json({ error: "No autorizado" });
  }
  return next();
};

// Checkout (requiere validación)
// body: {"items": [{"sku": "string", "cantidad": number}],
//        "metodo_pago": "Tarjeta", "direccion_envio": "string"}
router.post("/checkout", VerifyToken, roleGuard, checkoutCompra);

// Exportación del router
export default router;