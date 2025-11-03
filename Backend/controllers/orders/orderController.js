// importaciones de paquetes
import mongoose from "mongoose";

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

    // Iniciar una sesión de MongoDB
    const session = await mongoose.startSession();
    // orderId es usado en la respuesta para identificar la orden
    let orderId = null;
    // invoiceId es usado en la respuesta para identificar la factura
    let invoiceId = null;
    // total es el total de la compra
    let total = 0;
    // lineItems es un array de los items de la compra
    const lineItems = [];

    // Iniciar una transacción
    try {
      await session.withTransaction(async () => {
        for (const it of items) {
          const { sku, cantidad } = it || {};
          if (!sku || typeof cantidad !== "number" || cantidad <= 0) {
            throw new Error("BAD_ITEM");
          }

          const productosCol = mongoose.connection.collection("productos");

          const found = await productosCol.findOne(
            { skus: { $elemMatch: { sku } } },
            { session, projection: { skus: { $elemMatch: { sku } }, nombre: 1 } }
          );
          if (!found || !found.skus || !found.skus[0]) {
            throw new Error(`SKU_NOT_FOUND:${sku}`);
          }
          const matched = found.skus[0];
          const precioUnit = Number(matched.precio);

          const updateRes = await productosCol.updateOne(
            { skus: { $elemMatch: { sku, stock: { $gte: cantidad } } } },
            { $inc: { "skus.$.stock": -cantidad } },
            { session }
          );
          if (updateRes.modifiedCount === 0) {
            throw new Error(`INSUFFICIENT:${sku}`);
          }

          const subtotal = precioUnit * cantidad;
          total += subtotal;
          lineItems.push({ sku, cantidad, precio_unitario: precioUnit, subtotal });
        }

        const ordersCol = mongoose.connection.collection("orders");
        const invoicesCol = mongoose.connection.collection("invoices");
        const now = new Date();

        const orderDoc = {
          user_id: req.userId || null,
          items: lineItems,
          metodo_pago,
          direccion_envio,
          total,
          status: "pagado",
          createdAt: now,
          created_by_role: req.user?.role || "user",
        };
        if (req.user?.role === "cajero"){
          orderDoc.cajero_id = req.userId;
          orderDoc.cajero_nombre = req.user?.nombre;
        }
        const orderRes = await ordersCol.insertOne(orderDoc, { session });
        orderId = orderRes.insertedId.toString();

        const invoiceDoc = {
          order_id: orderRes.insertedId,
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

    return res.status(201).json({ order_id: orderId, total_pagado: total, invoice_id: invoiceId });
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
