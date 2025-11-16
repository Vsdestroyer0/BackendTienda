import { Router } from 'express';

// 1. ¡CORREGIDO! Importamos tu función 'VerifyToken' de 'authMiddleware.js'
import { VerifyToken } from '../../middleware/authMiddleware.js';

// 2. Importamos las funciones del controlador
import {
  getAddresses,
  getAddress,
  createAddress,
  updateAddress,
  deleteAddress,
} from '../../controllers/users/address.controller.js'; // Ruta al controlador que acabas de crear

const router = Router();

// 3. ¡MUY IMPORTANTE! ¡CORREGIDO!
// Aplicamos el middleware 'VerifyToken' a TODAS las rutas de este archivo.
// Nadie que no esté logueado (sin un token JWT válido) podrá usarlas.
router.use(VerifyToken);

// 4. Definimos las rutas
// El prefijo '/api' se define en server.js (Paso 4)

// [GET] /api/address  -> Obtener todas mis direcciones
router.get('/address', getAddresses);

// [GET] /api/address/:id  -> Obtener una dirección por su ID
router.get('/address/:id', getAddress);

// [POST] /api/address -> Crear una nueva dirección
router.post('/address', createAddress);

// [PUT] /api/address/:id -> Actualizar una dirección por su ID
router.put('/address/:id', updateAddress);

// [DELETE] /api/address/:id -> Borrar una dirección por su ID
router.delete('/address/:id', deleteAddress);

export default router;