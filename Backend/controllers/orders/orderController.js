// importaciones de paquetes
import mongoose from "mongoose";
import Product from "../../models/product/Product.js";

// Función para validar y procesar una compra

export const checkoutCompra = async (req, res) => {
  try {
    // Desestructuración de los datos del body
    // La desestructuración es una forma de extraer datos de un objeto, en este caso extraemos items, metodo_pago y direccion_envio
    // req.body es el body de la solicitud que se envia desde el frontend
    const { items, metodo_pago, direccion_envio } = req.body || {};
    // Validación de los datos
    if (!Array.isArray(items) || items.length === 0 || !metodo_pago || !direccion_envio) {
      return res.status(400).json({ success: false, message: "Datos inválidos" });
    }

    const allowedPaymentMethods = ["Efectivo", "Tarjeta"];
    if (!allowedPaymentMethods.includes(metodo_pago)) {
      return res.status(400).json({ success: false, message: "Método de pago inválido" });
    }

    // Iniciar una sesión de MongoDB
    const session = await mongoose.startSession();
    // orderId es usado en la respuesta para identificar la orden
    let orderId = null;
    // invoiceId es usado en la respuesta para identificar la factura
    let invoiceId = null;
    // subtotal y total de la compra
    let subtotal = 0;
    // lineItems es un array de los items de la compra
    const lineItems = [];

    // Iniciar una transacción
    try {
      await session.withTransaction(async () => {
        for (const it of items) {
          const { sku, size, cantidad } = it || {}; // <-- 'size' es nuevo
          if (!sku || !size || typeof cantidad !== "number" || cantidad <= 0) {
            throw new Error("BAD_ITEM");
          }

          // ¡YA NO USAMOS 'productosCol'!
          const product = await Product.findOne(
            { "variants.sku": sku },
            { session }
          );

          if (!product) {
            throw new Error(`SKU_NOT_FOUND:${sku}`);
          }

          // Encontrar la variante y la talla específicas
          const variant = product.variants.find(v => v.sku === sku);
          const sizeInfo = variant?.sizes.find(s => s.size === size);

          if (!sizeInfo) {
            throw new Error(`SIZE_NOT_FOUND:${sku}/${size}`);
          }

          const precioUnit = Number(product.salePrice || product.price); // Usar precio base

          // ¡LA QUERY MÁS DIFÍCIL!
          // Actualizar el stock anidado atómicamente
          const updateRes = await Product.updateOne(
            {
              _id: product._id,
              "variants.sku": sku,
              "variants.sizes.size": size,
              "variants.sizes.stock": { $gte: cantidad } // Asegurar stock
            },
            {
              // Decrementar el stock
              $inc: { "variants.$[v].sizes.$[s].stock": -cantidad }
            },
            {
              // 'arrayFilters' le dice a Mongoose qué elementos [v] y [s] actualizar
              arrayFilters: [
                { "v.sku": sku },
                { "s.size": size }
              ],
              session
            }
          );

          if (updateRes.modifiedCount === 0) {
            throw new Error(`INSUFFICIENT:${sku}/${size}`);
          }
          subtotal += (precioUnit * cantidad);
          lineItems.push({ sku, size, cantidad, precio_unitario: precioUnit, /*...*/ });
        }

        const ordersCol = mongoose.connection.collection("orders");
        const invoicesCol = mongoose.connection.collection("invoices");
        const now = new Date();

        iva = Math.round(subtotal * 0.16 * 100) / 100;
        total = subtotal + iva;

        const orderDoc = {
          user_id: req.userId || null,
          items: lineItems,
          metodo_pago,
          direccion_envio,
          subtotal,
          iva,
          total,
          status: "pagado",
          createdAt: now,
          created_by_role: req.user?.role || "user",
        };
        if (req.user?.role === "cajero") {
          orderDoc.cajero_id = req.userId;
          orderDoc.cajero_nombre = req.user?.nombre;
        }
        const orderRes = await ordersCol.insertOne(orderDoc, { session });
        orderId = orderRes.insertedId.toString();

        const invoiceDoc = {
          order_id: orderRes.insertedId,
          subtotal,
          iva,
          total_pagado: total,
          metodo_pago,
          issuedAt: now,
        };
        const invRes = await invoicesCol.insertOne(invoiceDoc, { session });
        invoiceId = invRes.insertedId.toString();
      });
    } finally {
      session.endSession();
    }

    const ivaResponse = Math.round(subtotal * 0.16 * 100) / 100;
    const totalResponse = subtotal + ivaResponse;
    return res.status(201).json({
      order_id: orderId,
      subtotal,
      iva: ivaResponse,
      total_pagado: totalResponse,
      invoice_id: invoiceId,
    });
  } catch (e) {
    if (typeof e.message === "string" && e.message.startsWith("INSUFFICIENT:")) {
      const sku = e.message.split(":")[1];
      return res.status(409).json({ error: `El SKU [${sku}] no tiene stock suficiente.` });
    }
    if (typeof e.message === "string" && e.message.startsWith("SKU_NO_ENCONTRADO:")) {
      const sku = e.message.split(":")[1];
      return res.status(404).json({ error: `El SKU [${sku}] no existe.` });
    }
    if (e.message === "BAD_ITEM") {
      return res.status(400).json({ error: "Items inválidos" });
    }
    console.error(e);
    return res.status(500).json({ error: "Error procesando la compra" });
  }
};

// Checkout específico para POS (cajero en tienda)
// No maneja tallas explícitas ni modifica stock por talla, solo registra la venta con desglose de IVA.
export const checkoutPosVenta = async (req, res) => {
  try {
    const { items, metodo_pago, origen_venta } = req.body || {};

    if (!Array.isArray(items) || items.length === 0 || !metodo_pago) {
      return res.status(400).json({ success: false, message: "Datos inválidos" });
    }

    const allowedPaymentMethods = ["Efectivo", "Tarjeta"];
    if (!allowedPaymentMethods.includes(metodo_pago)) {
      return res.status(400).json({ success: false, message: "Método de pago inválido" });
    }

    const session = await mongoose.startSession();
    let orderId = null;
    let invoiceId = null;
    let ticketId = null;
    let subtotal = 0;
    let iva = 0;
    let total = 0;
    const lineItems = [];

    try {
      await session.withTransaction(async () => {
        for (const it of items) {
          const { sku, size, cantidad } = it || {};
          if (!sku || !size || typeof cantidad !== "number" || cantidad <= 0) {
            throw new Error("BAD_ITEM");
          }

          const product = await Product.findOne(
            { "variants.sku": sku },
            null,
            { session }
          );

          if (!product) {
            throw new Error(`SKU_NOT_FOUND:${sku}`);
          }

          const variant = product.variants.find((v) => v.sku === sku);
          const sizeInfo = variant?.sizes.find((s) => s.size === size);
          if (!sizeInfo) {
            throw new Error(`SIZE_NOT_FOUND:${sku}/${size}`);
          }

          const precioUnit = Number(product.salePrice || product.price);

          const updateRes = await Product.updateOne(
            {
              _id: product._id,
              "variants.sku": sku,
              "variants.sizes.size": size,
              "variants.sizes.stock": { $gte: cantidad },
            },
            {
              $inc: { "variants.$[v].sizes.$[s].stock": -cantidad },
            },
            {
              arrayFilters: [
                { "v.sku": sku },
                { "s.size": size },
              ],
              session,
            }
          );

          if (updateRes.modifiedCount === 0) {
            throw new Error(`INSUFFICIENT:${sku}/${size}`);
          }

          subtotal += precioUnit * cantidad;
          lineItems.push({ sku, size, cantidad, precio_unitario: precioUnit });
        }

        const ordersCol = mongoose.connection.collection("orders");
        const invoicesCol = mongoose.connection.collection("invoices");
        const now = new Date();

        const iva = Math.round(subtotal * 0.16 * 100) / 100;
        const total = subtotal + iva;

        const orderDoc = {
          user_id: null,
          items: lineItems,
          metodo_pago,
          direccion_envio: origen_venta || "VENTA_POS",
          subtotal,
          iva,
          total,
          status: "pagado",
          createdAt: now,
          created_by_role: req.user?.role || "cajero",
        };

        if (req.user?.role === "cajero") {
          orderDoc.cajero_id = req.userId;
          orderDoc.cajero_nombre = req.user?.nombre;
        }

        const orderRes = await ordersCol.insertOne(orderDoc, { session });
        orderId = orderRes.insertedId.toString();

        const invoiceDoc = {
          order_id: orderRes.insertedId,
          subtotal,
          iva,
          total_pagado: total,
          metodo_pago,
          issuedAt: now,
        };

        const invRes = await invoicesCol.insertOne(invoiceDoc, { session });
        invoiceId = invRes.insertedId.toString();

        const ticketsCol = mongoose.connection.collection("tickets");
        const ticketDoc = {
          order_id: orderRes.insertedId,
          invoice_id: invRes.insertedId,
          items: lineItems,
          subtotal,
          iva,
          total_pagado: total,
          metodo_pago,
          cajero_id: orderDoc.cajero_id ?? null,
          cajero_nombre: orderDoc.cajero_nombre ?? "",
          origen_venta: orderDoc.direccion_envio,
          createdAt: now,
        };

        const ticketRes = await ticketsCol.insertOne(ticketDoc, { session });
        ticketId = ticketRes.insertedId.toString();
      });
    } finally {
      session.endSession();
    }
    return res.status(201).json({
      order_id: orderId,
      subtotal,
      iva,
      total_pagado: subtotal + iva,
      invoice_id: invoiceId,
      ticket_id: ticketId,
    });
  } catch (e) {
    if (typeof e.message === "string" && e.message.startsWith("SKU_NOT_FOUND:")) {
      const sku = e.message.split(":")[1];
      return res.status(404).json({ error: `El SKU [${sku}] no existe.` });
    }
    if (typeof e.message === "string" && e.message.startsWith("INSUFFICIENT:")) {
      const sku = e.message.split(":")[1];
      return res.status(409).json({ error: `El SKU [${sku}] no tiene stock suficiente para la talla seleccionada.` });
    }
    if (e.message === "BAD_ITEM") {
      return res.status(400).json({ error: "Items inválidos" });
    }
    console.error("[checkoutPosVenta] Error inesperado:", e);
    return res.status(500).json({
      error: "Error procesando la venta POS",
      details: typeof e.message === "string" ? e.message : String(e),
    });
  }
};

export const listUserOrders = async (req, res) => {
  try {
    const userId = req.userId;
    const ordersCol = mongoose.connection.collection("orders");
    const cursor = ordersCol
      .find({ user_id: userId }, { projection: { _id: 1, createdAt: 1, total: 1, status: 1 } })
      .sort({ createdAt: -1 });
    const docs = await cursor.toArray();
    const data = docs.map((d) => ({
      order_id: d._id.toString(),
      fecha: d.createdAt instanceof Date ? d.createdAt.toISOString() : String(d.createdAt),
      total: d.total,
      estatus: d.status === "pagado" ? "Pagado" : String(d.status || ""),
    }));
    return res.status(200).json(data);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Error listando órdenes" });
  }
};

export const getUserOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;
    let _id;
    try {
      _id = new mongoose.Types.ObjectId(orderId);
    } catch {
      return res.status(400).json({ error: "orderId inválido" });
    }
    const ordersCol = mongoose.connection.collection("orders");
    const order = await ordersCol.findOne(
      { _id },
      { projection: { items: 1, total: 1, status: 1, createdAt: 1, user_id: 1 } }
    );
    if (!order || order.user_id !== req.userId) {
      return res.status(404).json({ error: "Orden no encontrada" });
    }

    const productosCol = mongoose.connection.collection("productos");
    const items = [];
    for (const it of order.items || []) {
      const sku = it?.sku;
      const cantidad = it?.cantidad;
      const precio = Number(it?.precio_unitario);
      let nombre = "";
      if (sku) {
        const prod = await productosCol.findOne(
          { skus: { $elemMatch: { sku } } },
          { projection: { nombre: 1 } }
        );
        nombre = prod?.nombre || "";
      }
      items.push({ sku, cantidad, precio, nombre });
    }

    return res.status(200).json({
      order_id: order._id.toString(),
      items,
      total: order.total,
      estatus: order.status === "pagado" ? "Pagado" : String(order.status || ""),
      fecha:
        order.createdAt instanceof Date
          ? order.createdAt.toISOString()
          : String(order.createdAt),
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Error obteniendo la orden" });
  }
};
