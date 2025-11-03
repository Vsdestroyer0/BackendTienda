// importaciones de paquetes
import mongoose from "mongoose";

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
export const getProductById = async (req, res) => {
  try {
    const { productId } = req.params;
    if (!productId) {
      return res.status(400).json({ success: false, message: "productId requerido" });
    }
    let _id;
    try { _id = new mongoose.Types.ObjectId(productId); } catch {
      return res.status(400).json({ success: false, message: "productId inválido" });
    }

    const col = mongoose.connection.collection("productos");
    const d = await col.findOne({ _id }, { projection: { nombre: 1, precio_base: 1, skus: 1 } });
    if (!d) {
      return res.status(404).json({ success: false, message: "Producto no encontrado" });
    }
    const variantes = Array.isArray(d.skus) ? d.skus.map(s => ({
      sku: s.sku,
      talla: typeof s.talla === "number" ? s.talla : Number(s.talla),
      stock: s.stock
    })) : [];
    const precioBase = typeof d.precio_base === "number" ? d.precio_base : (Array.isArray(d.skus) && typeof d.skus[0]?.precio === "number" ? d.skus[0].precio : null);

    return res.status(200).json({
      product_id: d._id?.toString(),
      nombre: d.nombre,
      precio_base: precioBase,
      variantes
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: "Error obteniendo producto" });
  }
};
