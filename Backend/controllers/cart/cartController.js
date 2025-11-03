// importaciones de paquetes
import mongoose from "mongoose";

const CARTS_COL = () => mongoose.connection.collection("carts");
const PRODUCTS_COL = () => mongoose.connection.collection("productos");

// GET /api/cart
export const getCart = async (req, res) => {
  try {
    const userId = req.userId;
    const cart = await CARTS_COL().findOne({ user_id: userId }, { projection: { _id: 0, items: 1 } });
    const items = cart?.items || [];

    // Enriquecer con nombre_producto, talla, precio
    const enriched = [];
    for (const it of items) {
      const sku = it?.sku;
      const cantidad = it?.cantidad;
      if (!sku || typeof cantidad !== "number") continue;

      const prod = await PRODUCTS_COL().findOne(
        { skus: { $elemMatch: { sku } } },
        { projection: { nombre: 1, skus: { $elemMatch: { sku } } } }
      );
      const matched = prod?.skus?.[0];
      if (!matched) continue;

      enriched.push({
        sku,
        cantidad,
        nombre_producto: prod?.nombre || "",
        talla: typeof matched.talla === "number" ? matched.talla : Number(matched.talla),
        precio: Number(matched.precio)
      });
    }

    return res.status(200).json({ items: enriched });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: "Error obteniendo carrito" });
  }
};

// POST /api/cart  { sku, cantidad }
export const addToCart = async (req, res) => {
  try {
    const userId = req.userId;
    const { sku, cantidad } = req.body || {};
    if (!sku || typeof cantidad !== "number" || !Number.isInteger(cantidad) || cantidad <= 0) {
      return res.status(400).json({ success: false, message: "Parámetros inválidos" });
    }

    // Validar SKU existente
    const prod = await PRODUCTS_COL().findOne(
      { skus: { $elemMatch: { sku } } },
      { projection: { _id: 1 } }
    );
    if (!prod) {
      return res.status(404).json({ success: false, message: "SKU no encontrado" });
    }

    const now = new Date();
    const cartsCol = CARTS_COL();
    const cart = await cartsCol.findOne({ user_id: userId });

    if (!cart) {
      await cartsCol.insertOne({ user_id: userId, items: [{ sku, cantidad }], updatedAt: now });
      return res.status(201).json({ message: "Producto agregado al carrito." });
    }

    // Buscar si ya existe el SKU
    const idx = (cart.items || []).findIndex((x) => x.sku === sku);
    if (idx >= 0) {
      cart.items[idx].cantidad += cantidad;
      await cartsCol.updateOne({ user_id: userId }, { $set: { items: cart.items, updatedAt: now } });
      return res.status(200).json({ message: "Producto agregado al carrito." });
    }

    // Nuevo SKU
    const newItems = [...(cart.items || []), { sku, cantidad }];
    await cartsCol.updateOne({ user_id: userId }, { $set: { items: newItems, updatedAt: now } });
    return res.status(201).json({ message: "Producto agregado al carrito." });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: "Error agregando al carrito" });
  }
};

// PUT /api/cart/:sku  { cantidad }
export const updateCartItem = async (req, res) => {
  try {
    const userId = req.userId;
    const { sku } = req.params;
    const { cantidad } = req.body || {};
    if (!sku || typeof cantidad !== "number" || !Number.isInteger(cantidad) || cantidad <= 0) {
      return res.status(400).json({ success: false, message: "Parámetros inválidos" });
    }

    const cartsCol = CARTS_COL();
    const cart = await cartsCol.findOne({ user_id: userId });
    if (!cart || !Array.isArray(cart.items)) {
      return res.status(404).json({ success: false, message: "Carrito no encontrado" });
    }

    const idx = cart.items.findIndex((x) => x.sku === sku);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: "Producto no está en el carrito" });
    }

    cart.items[idx].cantidad = cantidad;
    await cartsCol.updateOne(
      { user_id: userId },
      { $set: { items: cart.items, updatedAt: new Date() } }
    );

    return res.status(200).json({ message: "Cantidad actualizada." });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: "Error actualizando carrito" });
  }
};

// DELETE /api/cart/:sku
export const removeFromCart = async (req, res) => {
  try {
    const userId = req.userId;
    const { sku } = req.params;
    if (!sku) {
      return res.status(400).json({ success: false, message: "SKU requerido" });
    }

    const cartsCol = CARTS_COL();
    const cart = await cartsCol.findOne({ user_id: userId });
    if (!cart || !Array.isArray(cart.items)) {
      return res.status(404).json({ success: false, message: "Carrito no encontrado" });
    }

    const newItems = cart.items.filter((x) => x.sku !== sku);
    await cartsCol.updateOne(
      { user_id: userId },
      { $set: { items: newItems, updatedAt: new Date() } }
    );

    return res.status(200).json({ message: "Producto eliminado del carrito." });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: "Error eliminando del carrito" });
  }
};
