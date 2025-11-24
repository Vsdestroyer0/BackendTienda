// importaciones de paquetes
import mongoose from "mongoose";
import Product from '../../models/product/Product.js'; // <-- ¡IMPORTAR EL MODELO!

// GET /api/products
export const listProducts = async (req, res) => {
  try {

    const { category } = req.query;

    const filter = {};
    if (category) {

      filter.category = category;
      }
    // 1. Usar el modelo Product
    const products = await Product.find(filter, {
      // 2. Proyectar los datos que el ProductCard necesita
      name: 1,
      brand: 1,
      price: 1,
      salePrice: 1,
      category: 1,
      variants: { $slice: 1 } // Tomar solo la primera variante
    });

    // 3. Transformar los datos para el frontend (IProductForCard)
    const data = products.map(p => {
      const firstVariant = p.variants?.[0];
      return {
        id: p._id.toString(),
        name: p.name,
        price: p.salePrice || p.price, // Enviar el precio de oferta si existe
        brand: p.brand,
        category: p.category,
        // Enviar la primera imagen de la primera variante
        imageUrl: firstVariant?.images?.[0] || '/placeholder-shoe.jpg'
      };
    });

    return res.status(200).json({ 
    products: data,
    pagination: {
      currentPage: 1,
        totalPages: 1,
        totalProducts: data.length,
        limit: data.length
    }});

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