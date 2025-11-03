// importaciones de paquetes
import mongoose from "mongoose";

// Ajusta el stock de una variante específica (SKU)
// Body: { "ajuste": number } (positivo suma, negativo resta)
export const adjustSkuStock = async (req, res) => {
  try {
    const sku = req.params?.sku;
    const { ajuste } = req.body || {};

    if (!sku || typeof ajuste !== "number" || !Number.isFinite(ajuste) || !Number.isInteger(ajuste)) {
      return res.status(400).json({ success: false, message: "Parámetros inválidos" });
    }

    const productosCol = mongoose.connection.collection("productos");

    // ajuste >= 0: se incrementa directamente
    if (ajuste >= 0) {
      const updateRes = await productosCol.updateOne(
        { skus: { $elemMatch: { sku } } },
        { $inc: { "skus.$.stock": ajuste } }
      );
      if (updateRes.matchedCount === 0) {
        return res.status(404).json({ success: false, message: "SKU no encontrado" });
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
        return res.status(404).json({ success: false, message: "SKU no encontrado" });
      }
      return res.status(409).json({ success: false, message: "Stock insuficiente para el ajuste" });
    }

    const prod = await productosCol.findOne(
      { skus: { $elemMatch: { sku } } },
      { projection: { skus: { $elemMatch: { sku } } } }
    );
    const nuevoStock = prod?.skus?.[0]?.stock;
    return res.status(200).json({ sku, stock_actualizado: nuevoStock });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: "Error ajustando stock" });
  }
};

// Crea un nuevo modelo de producto con sus variantes (SKUs)
// Body: {
//   "nombre": "string",
//   "precio_base": number,
//   "variantes": [ { "sku": string, "talla": number, "stock_inicial": number }, ... ]
// }
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

    const productosCol = mongoose.connection.collection("productos");

    // Verificar duplicados existentes en DB
    const skuArray = Array.from(skusSet);
    const exists = await productosCol.findOne(
      { skus: { $elemMatch: { sku: { $in: skuArray } } } },
      { projection: { _id: 1, skus: 1 } }
    );
    if (exists) {
      const existentes = (exists.skus || []).map((s) => s.sku);
      const conflictivo = skuArray.find((s) => existentes.includes(s));
      return res.status(409).json({ success: false, message: `SKU ya existente: ${conflictivo || skuArray[0]}` });
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
    return res.status(201).json({ message: "Producto creado con éxito.", product_id: insertRes.insertedId.toString() });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: "Error creando producto" });
  }
};
