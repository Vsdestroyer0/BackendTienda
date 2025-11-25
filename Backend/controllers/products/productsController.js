// importaciones de paquetes
import mongoose from "mongoose";
import Product from '../../models/product/Product.js'; // <-- ¡IMPORTAR EL MODELO!

// GET /api/products
export const listProducts = async (req, res) => {
  try {
    // 1. Leer parámetros de paginación 
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const category = req.query.category; // Por si acaso se usa el filtro
    const targetGender = req.query.targetGender; // H = hombres, M = mujeres, N = niños

    // 2. Filtro opcional
    const filter = {};
    if (category) {
      filter.category = { $regex: category, $options: "i" }; // Búsqueda flexible
    }

    if (targetGender) {
      filter.targetGender = targetGender; // Coincidencia exacta por género objetivo
    }

    // 3. Obtener totales para la metadata de paginación
    const totalProducts = await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalProducts / limit);

    // 4. Consulta paginada
    const products = await Product.find(filter, {
      name: 1,
      brand: 1,
      price: 1,
      salePrice: 1,
      variants: { $slice: 1 } // Solo la primera variante para la card
    })
      .skip((page - 1) * limit)
      .limit(limit);

    // 5. Mapeo de datos (igual que antes)
    const formattedProducts = products.map(p => {
      const firstVariant = p.variants?.[0];
      return {
        id: p._id.toString(),
        name: p.name,
        price: p.salePrice || p.price,
        brand: p.brand,
        imageUrl: firstVariant?.images?.[0] || '/placeholder-shoe.jpg'
      };
    });

    // 6. RESPUESTA ESTRUCTURADA (La corrección clave)
    // Esto es lo que 'useProducts' está intentando leer desesperadamente
    return res.status(200).json({
      products: formattedProducts, // El array de datos
      pagination: {                // La metadata
        totalProducts,
        totalPages,
        currentPage: page,
        limit
      }
    });

  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: "Error listando productos" });
  }
};

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