// importaciones de paquetes
import mongoose from "mongoose";
import Product from '../../models/product/Product.js';

// GET /api/products
export const listProducts = async (req, res) => {
  try {
    const col = mongoose.connection.collection("productos");
    const cursor = col.find({}, {
      projection: {
        nombre: 1,
        precio_base: 1,
        skus: 1
      }
    });
    const docs = await cursor.toArray();
    const data = docs.map(d => {
      const variantes = Array.isArray(d.skus) ? d.skus.map(s => ({
        sku: s.sku,
        talla: typeof s.talla === "number" ? s.talla : Number(s.talla),
        stock: s.stock
      })) : [];
      const precioBase = typeof d.precio_base === "number" ? d.precio_base : (Array.isArray(d.skus) && typeof d.skus[0]?.precio === "number" ? d.skus[0].precio : null);
      return {
        product_id: d._id?.toString(),
        nombre: d.nombre,
        precio_base: precioBase,
        variantes
      };
    });
    return res.status(200).json(data);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: "Error listando productos" });
  }
};

// GET /api/products/:productId


// ... (Aquí podrías tener tu función 'getProducts' que ya existía) ...

/**
 * @desc    Obtiene un solo producto por su ID
 * @route   GET /api/products/:productId
 * @access  Público
 */
export const getProductById = async (req, res) => {
  try {
    // 1. Obtener el ID de los parámetros de la URL
    const { productId } = req.params;

    // 2. Validar que el ID sea un ID de MongoDB válido
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: 'ID de producto no válido' });
    }

    // 3. Buscar en la base de datos
    const product = await Product.findById(productId);

    // 4. Si el producto no se encuentra (ID válido pero no existe)
    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    // 5. ¡Éxito! Enviar el producto completo.
    // Esta respuesta (product) SÍ DEBE incluir el arreglo 'variants'.
    return res.status(200).json(product);

  } catch (error) {
    // 6. Manejo de errores (ej. error de conexión a la BD)
    console.error('Error al obtener producto por ID:', error);
    return res.status(500).json({ message: 'Error del servidor' });
  }
};
