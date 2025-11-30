// importaciones de paquetes
import mongoose from "mongoose";
import Product from '../../models/product/Product.js'; // <-- ¡IMPORTAR EL MODELO!
import Brand from '../../models/product/Brand.js';
import Category from '../../models/product/Category.js';

// GET /api/products
export const listProducts = async (req, res) => {
  try {
    // 1. Leer parámetros de paginación 
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const category = req.query.category; // Por si acaso se usa el filtro
    const targetGender = req.query.targetGender; // H = hombres, M = mujeres, N = niños
    const brand = req.query.brand; // filtro exacto por marca (slug o nombre)
    const minPrice = req.query.minPrice ? Number(req.query.minPrice) : null;
    const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : null;
    const search = req.query.search || req.query.q;

    // 2. Filtro opcional
    const filter = {};
    
    console.log('🔍 Search parameter:', search);
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },       // Buscar en nombre
        { description: { $regex: search, $options: "i" } }, // Buscar en descripción
        { brand: { $regex: search, $options: "i" } }        // Buscar en marca
      ];
      console.log('🎯 Filter applied:', JSON.stringify(filter, null, 2));
    }

    if (category) {
      filter.category = { $regex: category, $options: "i" }; // Búsqueda flexible
    }

    if (targetGender) {
      filter.targetGender = targetGender; // Coincidencia exacta por género objetivo
    }

    if (brand) {
      filter.brand = brand; // Coincidencia exacta por marca
    }

    if (minPrice !== null || maxPrice !== null) {
      filter.price = {};
      if (minPrice !== null) filter.price.$gte = minPrice;
      if (maxPrice !== null) filter.price.$lte = maxPrice;
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
      description: 1,
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

// GET /api/products/brands - catálogo de marcas
export const listBrands = async (req, res) => {
  try {
    const brands = await Brand.find({}, { name: 1, slug: 1 }).sort({ name: 1 });
    return res.status(200).json(brands);
  } catch (error) {
    console.error('Error al listar marcas:', error);
    return res.status(500).json({ message: 'Error al listar marcas' });
  }
};

// GET /api/products/categories - catálogo de categorías
export const listCategories = async (req, res) => {
  try {
    const categories = await Category.find({}, { name: 1, slug: 1, type: 1 }).sort({ name: 1 });
    return res.status(200).json(categories);
  } catch (error) {
    console.error('Error al listar categorías:', error);
    return res.status(500).json({ message: 'Error al listar categorías' });
  }
};