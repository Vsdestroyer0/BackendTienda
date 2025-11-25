// Importaciones de paquetes
import { Router } from "express";

// Importaciones internas
import {
  listProducts,
  getProductById,
  listBrands,
  listCategories,
} from "../../controllers/products/productsController.js";

const router = Router();

// GET /api/products
router.get("/", listProducts);

// Catálogos
router.get("/brands", listBrands);
router.get("/categories", listCategories);

// GET /api/products/:productId
router.get("/:productId", getProductById);

export default router;
