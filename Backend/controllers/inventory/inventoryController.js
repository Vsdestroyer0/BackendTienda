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

//  endpoint para crear productos 
export const createProductV2 = async (req, res) => {
  try {
    // req.body debe ser un objeto compatible con IProductDetail
    const productData = req.body;

    //! añadir alguna validacion de datos aquí (Zod)
    if (!productData || !productData.name || !productData.brand || !productData.variants) {
      return res.status(400).json({ message: "Datos del producto incompletos." });
    }

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


//!deben refactorizarse porque cambio la estructura de los productos
// (DEPRECADO) Ajusta el stock de una variante específica (SKU)
export const adjustSkuStock = async (req, res) => {
  try {
    const sku = req.params?.sku;
    const { ajuste } = req.body || {};

    if (!sku || typeof ajuste !== "number" || !Number.isFinite(ajuste) || !Number.isInteger(ajuste)) {
      return res.status(400).json({ success: false, message: "Parámetros inválidos" });
    }

    const productosCol = mongoose.connection.collection("productos"); // <-- COLECCIÓN VIEJA

    // ajuste >= 0: se incrementa directamente
    if (ajuste >= 0) {
      const updateRes = await productosCol.updateOne(
        { skus: { $elemMatch: { sku } } },
        { $inc: { "skus.$.stock": ajuste } }
      );
      if (updateRes.matchedCount === 0) {
        return res.status(404).json({ success: false, message: "SKU no encontrado (colección vieja)" });
      }
      const prod = await productosCol.findOne(
        { skus: { $elemMatch: { sku } } },
        { projection: { skus: { $elemMatch: { sku } } } }
      );
      const nuevoStock = prod?.skus?.[0]?.stock;
      return res.status(200).json({ sku, stock_actualizado: nuevoStock });
    }

    // ajuste negativo: validar que hay stock suficiente
    const cantidadARestar = Math.abs(ajuste);
    const updateRes = await productosCol.updateOne(
      { skus: { $elemMatch: { sku, stock: { $gte: cantidadARestar } } } },
      { $inc: { "skus.$.stock": -cantidadARestar } }
    );

    if (updateRes.matchedCount === 0) {
      const exists = await productosCol.findOne(
        { skus: { $elemMatch: { sku } } },
        { projection: { _id: 1 } }
      );
      if (!exists) {
        return res.status(404).json({ success: false, message: "SKU no encontrado (colección vieja)" });
      }
      return res.status(409).json({ success: false, message: "Stock insuficiente para el ajuste (colección vieja)" });
    }

    const prod = await productosCol.findOne(
      { skus: { $elemMatch: { sku } } },
      { projection: { skus: { $elemMatch: { sku } } } }
    );
    const nuevoStock = prod?.skus?.[0]?.stock;
    return res.status(200).json({ sku, stock_actualizado: nuevoStock });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: "Error ajustando stock (colección vieja)" });
  }
};

// (DEPRECADO) Crea un nuevo modelo de producto
export const createProduct = async (req, res) => {
  try {
    const { nombre, precio_base, variantes } = req.body || {};

    // Validaciones básicas
    if (!nombre || typeof nombre !== "string") {
      return res.status(400).json({ success: false, message: "'nombre' es requerido" });
    }
    if (typeof precio_base !== "number" || !Number.isFinite(precio_base) || precio_base < 0) {
      return res.status(400).json({ success: false, message: "'precio_base' inválido" });
    }
    if (!Array.isArray(variantes) || variantes.length === 0) {
      return res.status(400).json({ success: false, message: "'variantes' debe ser un arreglo no vacío" });
    }

    // Validar variantes y recolectar SKUs
    const skusSet = new Set();
    const skus = [];
    for (const v of variantes) {
      const sku = v?.sku;
      const talla = v?.talla;
      const stockInicial = v?.stock_inicial;
      if (!sku || typeof sku !== "string") {
        return res.status(400).json({ success: false, message: "Cada variante requiere 'sku' string" });
      }
      if (typeof talla !== "number" || !Number.isFinite(talla)) {
        return res.status(400).json({ success: false, message: `Variante ${sku}: 'talla' inválida` });
      }
      if (!Number.isInteger(stockInicial) || stockInicial < 0) {
        return res.status(400).json({ success: false, message: `Variante ${sku}: 'stock_inicial' inválido` });
      }
      if (skusSet.has(sku)) {
        return res.status(400).json({ success: false, message: `SKU duplicado en la petición: ${sku}` });
      }
      skusSet.add(sku);
      skus.push({ sku, talla, precio: precio_base, stock: stockInicial });
    }

    const productosCol = mongoose.connection.collection("productos"); // <-- COLECCIÓN VIEJA

    // Verificar duplicados existentes en DB
    const skuArray = Array.from(skusSet);
    const exists = await productosCol.findOne(
      { skus: { $elemMatch: { sku: { $in: skuArray } } } },
      { projection: { _id: 1, skus: 1 } }
    );
    if (exists) {
      const existentes = (exists.skus || []).map((s) => s.sku);
      const conflictivo = skuArray.find((s) => existentes.includes(s));
      return res.status(409).json({ success: false, message: `SKU ya existente: ${conflictivo || skuArray[0]} (colección vieja)` });
    }

    // Construir documento del producto
    const now = new Date();
    const productDoc = {
      nombre,
      precio_base,
      skus,
      createdAt: now,
    };

    const insertRes = await productosCol.insertOne(productDoc);
    return res.status(201).json({ message: "Producto creado con éxito (colección vieja).", product_id: insertRes.insertedId.toString() });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: "Error creando producto (colección vieja)" });
  }
};