import { Router } from "express";
import { VerifyToken, verifyRole } from "../../middleware/authMiddleware.js";
import { 
    getAddresses, 
    addAddress, 
    deleteAddress 
} from "../../controllers/users/userController.js";

const router = Router();

// Middleware global para estas rutas: Solo usuarios autenticados
router.use(VerifyToken, verifyRole("user"));

router.get("/addresses", getAddresses);
router.post("/addresses", addAddress);
router.delete("/addresses/:id", deleteAddress);

export default router;