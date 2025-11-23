import { Router } from "express";
import { VerifyToken, verifyRole } from "../../middleware/authMiddleware.js";
import { getFavorites, addFavorite, removeFavorite } from "../../controllers/favorites/favoritesController.js";

const router = Router();

// Proteger todas las rutas, solo para clientes
router.use(VerifyToken, verifyRole("user"));

router.get("/", getFavorites);
router.post("/", addFavorite);
router.delete("/:sku", removeFavorite);

export default router;