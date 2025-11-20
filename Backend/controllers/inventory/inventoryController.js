import mongoose from "mongoose";
import { v2 as cloudinary } from 'cloudinary';
import Product from '../../models/product/Product.js';


cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// endpoint para la firma de Cloudinary 
export const getCloudinarySignature = (req, res) => {
  try {
    const timestamp = Math.round((new Date).getTime() / 1000);

    // generar firma segura
    const signature = cloudinary.utils.api_sign_request(
      { timestamp: timestamp },
      process.env.CLOUDINARY_API_SECRET
    );

    res.json({
      timestamp,
      signature,
      api_key: process.env.CLOUDINARY_API_KEY,
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME
    });
  } catch (error) {
    console.error("Error al generar la firma:", error);
    res.status(500).json({ message: "Error al generar la firma" });
  }
};

//funcion auxiliar para generar codigos
const generateCode = (text, length = 3) => {
  if (!text) return "XXX";
  return text
    .toString()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Quitar acentos
    .replace(/[^a-zA-Z0-9]/g, "") // Quitar caracteres raros
    .toUpperCase()
    .substring(0, length);
};

//  endpoint para crear productos 
export const createProductV2 = async (req, res) => {
  try {
    // req.body debe ser un objeto compatible con IProductDetail
    const productData = req.body;

    //! añadir alguna validacion de datos aquí (Zod)
    if (!productData || !productData.name || !productData.brand || !productData.variants) {
      return res.status(400).json({ message: "Datos del producto incompletos." });
    }

    const brandCode = generateCode(productData.brand, 3);
    const nameCode = generateCode(productData.name, 4); // Ej: BOTA
    const categoryCode = generateCode(productData.category || "GEN", 3);

    productData.variants = productData.variants.map((variant, index) => {
      const colorCode = generateCode(variant.colorName, 3);

      // Fórmula: MARCA-CATEGORIA-NOMBRE-COLOR-INDICE
      // El índice es vital por si tienes dos colores que empiezan igual (Azul vs Azur)
      // Ej: AVE-CAL-BOTA-MAR-01
      const autoSku = `${brandCode}-${categoryCode}-${nameCode}-${colorCode}-${(index + 1).toString().padStart(2, '0')}`;

      return {
        ...variant,
        sku: autoSku // <-- ¡Aquí inyectamos el SKU!
      };
    });



    const newProduct = new Product(productData);
    await newProduct.save();

    return res.status(201).json({
      message: "Producto creado con éxito.",
      product_id: newProduct._id.toString()
    });

  } catch (e) {
    console.error("Error creando producto (V2):", e);
    if (e.code === 11000) { // SKU duplicado, error
      return res.status(409).json({ message: "SKU o producto ya existente" });
    }
    return res.status(500).json({ message: "Error creando producto", error: e.message });
  }
};

//obtener estaditcas sobre los productos 
export const getInventoryStats = async (req, res) => {
  try {
    // 1. Calcular 'Productos en Oferta'
    const onSaleCountPromise = Product.countDocuments({
      salePrice: { $exists: true, $gt: 0 },
    });


    const totalProductsPromise = Product.countDocuments({});

    // 2. Calcular 'Items Totales', 'Bajo Stock' y 'Sin Stock' con Agregaciones
    // (Esto es el 'flatMap' anidado, pero hecho en la base de datos)
    const stockStatsPromise = Product.aggregate([
      // "Desanidar" el array de variantes
      { $unwind: "$variants" },
      // "Desanidar" el array de tallas
      { $unwind: "$variants.sizes" },
      // Ahora tenemos una fila por cada SKU/Talla
      // Calculamos todos los KPIs de stock en una sola pasada
      {
        $group: {
          _id: null, // Agrupar todo en un solo documento
          totalItems: { $sum: 1 }, // Contar el total de filas (SKU/Talla)
          lowStockCount: {
            $sum: {
              // Si el stock está entre 1 y 9 (puedes ajustar el 10), suma 1
              $cond: [{ $and: [{ $gt: ["$variants.sizes.stock", 0] }, { $lt: ["$variants.sizes.stock", 10] }] }, 1, 0]
            }
          },
          noStockCount: {
            $sum: {
              // Si el stock es 0, suma 1
              $cond: [{ $eq: ["$variants.sizes.stock", 0] }, 1, 0]
            }
          }
        }
      }
    ]);

    // 3. Ejecutar todas las consultas en paralelo
    const [onSaleCount, totalProducts, stockStatsResult] = await Promise.all([
      onSaleCountPromise,
      totalProductsPromise,
      stockStatsPromise,
    ]);
    const stats = stockStatsResult[0] || {}; // El resultado de aggregate es un array

    // 4. Enviar la respuesta
    res.status(200).json({
      onSaleCount: onSaleCount || 0,
      totalProducts: totalProducts || 0,
      totalItems: stats.totalItems || 0,
      totalStock: stats.totalStock || 0,
      lowStockCount: stats.lowStockCount || 0,
      noStockCount: stats.noStockCount || 0,
    });

  } catch (e) {
    console.error("Error obteniendo stats de inventario:", e);
    res.status(500).json({ message: "Error al obtener estadísticas" });
  }
};


//obtener toda la data de productos pero ahora acepta parametro para pagina ion
export const getInventoryProducts = async (req, res) => {
  try {
    // 1. Leer parámetros de la query (con valores por defecto)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20; // 20 productos por página
    const skip = (page - 1) * limit;

    // 2. Crear las dos consultas (una para los datos, una para el conteo total)
    const productsPromise = Product.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const countPromise = Product.countDocuments({});

    // 3. Ejecutarlas en paralelo para máxima eficiencia
    const [products, totalProducts] = await Promise.all([
      productsPromise,
      countPromise
    ]);

    // 4. Calcular el total de páginas
    const totalPages = Math.ceil(totalProducts / limit);

    // 5. Enviar la respuesta con la data y la metadata de paginación
    res.status(200).json({
      data: products,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalProducts: totalProducts,
        limit: limit
      }
    });

  } catch (e) {
    console.error("Error obteniendo productos de inventario:", e);
    res.status(500).json({ message: "Error al obtener productos" });
  }
};


export const adjustStock = async (req, res) => {
  try {
    const { sku, size, adjustment } = req.body; // adjustment  1 o -1

    if (!sku || !size || typeof adjustment !== 'number') {
      return res.status(400).json({ message: "Datos incompletos" });
    }

    // buscar el producto que tenga ese SKU y esa Talla
    const filter = {
      "variants.sku": sku,
      "variants.sizes.size": size
    };

    //! si es negativo, validar stock, no se hacerlo xd
    if (adjustment < 0) {
      // $gte: mayor o igual a (ej: si adjustment es -1, necesitamos stock >= 1)
      // Nota: Math.abs(-1) = 1
      // Sin embargo, MongoDB query anidado complejo es difícil. 
      // Para simplificar y seguridad, usaremos la validación atómica en el update.
      // Mongoose permite condiciones en el arrayFilter o en el query principal.

      // Agregamos condición al query principal para no encontrar el doc si no hay stock
      // "variants.sizes" debe tener un elemento con ese size Y stock suficiente
      // Esto es un poco complejo de escribir en una sola línea de query con nested arrays.
      // Vamos a confiar en que el updateOne retornará modifiedCount: 0 si falla el arrayFilter
    }

    const result = await Product.updateOne(
      {
        "variants.sku": sku,
        "variants.sizes.size": size,
        // ESTO EVITA NEGATIVOS: Solo actualiza si el stock resultante será >= 0
        // Pero requiere saber qué elemento es.
        // Usaremos una estrategia más simple: update normal y validamos en frontend por ahora,
        // o mejor: usamos arrayFilters con condición.
      },
      {
        $inc: { "variants.$[v].sizes.$[s].stock": adjustment }
      },
      {
        arrayFilters: [
          { "v.sku": sku },
          // solo si el stock + ajuste >= 0
          { "s.size": size, "s.stock": { $gte: -adjustment < 0 ? 0 : -adjustment } }
        ]
      }
    );

    if (result.modifiedCount === 0) {
      // Si no se modificó nada, probablemente no había stock suficiente o no existe el SKU
      return res.status(400).json({ message: "No se pudo ajustar (¿Stock insuficiente?)" });
    }

    res.json({ message: "Stock actualizado" });

  } catch (error) {
    console.error("Error ajustando stock:", error);
    res.status(500).json({ message: "Error del servidor" });
  }
};

export const deleteProductById = async (req, res) => {
  try {
    const { id } = req.params;

    // validar ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID de producto inválido" });
    }

    // borrar,findByIdAndDelete retorna el documento eliminado o null si no existe
    const deletedProduct = await Product.findByIdAndDelete(id);

    if (!deletedProduct) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    res.json({ message: "Producto eliminado correctamente", id });

  } catch (error) {
    console.error("Error eliminando producto:", error);
    res.status(500).json({ message: "Error del servidor al eliminar" });
  }
};
