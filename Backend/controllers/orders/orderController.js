import mongoose from "mongoose";
import Product from "../../models/product/Product.js";
import Usuario from "../../models/users/usuario.js"; 

const SHIPPING_COSTS = {
  standard: 150,
  express: 300,
  free_threshold: 2000 // envío estándar gratis si subtotal > 2000
};

// procesa la venta web completa (Carrito -> Orden)
export const checkoutCompra = async (req, res) => {
  try {
    const { items, metodo_pago, address_id, shipping_method } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "El carrito está vacío" });
    }
    if (!metodo_pago || !address_id || !shipping_method) {
      return res.status(400).json({ success: false, message: "Faltan datos de envío o pago" });
    }

    const allowedPaymentMethods = ["Efectivo", "Tarjeta"];
    if (!allowedPaymentMethods.includes(metodo_pago)) {
      return res.status(400).json({ success: false, message: "Método de pago inválido" });
    }

    // CORRECCIÓN: req.user.id
    const user = await Usuario.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "Usuario no encontrado" });
    }

    const direccionSeleccionada = user.direcciones.id(address_id);
    
    if (!direccionSeleccionada) {
      return res.status(400).json({ success: false, message: "La dirección de envío seleccionada no es válida." });
    }

    const session = await mongoose.startSession();
    
    let orderId = null;
    let invoiceId = null;
    let subtotal = 0;
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

          const variant = product.variants.find(v => v.sku === sku);
          const sizeInfo = variant?.sizes.find(s => s.size === size);

          if (!sizeInfo) {
            throw new Error(`SIZE_NOT_FOUND:${sku}/${size}`);
          }

          if (sizeInfo.stock < cantidad) {
             throw new Error(`INSUFFICIENT:${sku}/${size}`);
          }

          const updateRes = await Product.updateOne(
            {
              _id: product._id,
              "variants.sku": sku,
              "variants.sizes.size": size,
              "variants.sizes.stock": { $gte: cantidad } 
            },
            {
              $inc: { "variants.$[v].sizes.$[s].stock": -cantidad }
            },
            {
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

          const precioUnit = Number(product.salePrice || product.price);
          subtotal += (precioUnit * cantidad);
          
          lineItems.push({ 
            sku, 
            size, 
            cantidad, 
            precio_unitario: precioUnit,
            nombre: product.name,
            imagen: variant.images[0] || "" 
          });
        }

        let costoEnvio = 0;
        if (shipping_method === 'express') {
            costoEnvio = SHIPPING_COSTS.express;
        } else {
            costoEnvio = subtotal > SHIPPING_COSTS.free_threshold ? 0 : SHIPPING_COSTS.standard;
        }

        const baseImponible = subtotal + costoEnvio;
        const iva = Math.round(baseImponible * 0.16 * 100) / 100;
        const total = baseImponible + iva;

        const now = new Date();

        const ordersCol = mongoose.connection.collection("orders");
        const orderDoc = {
          // CORRECCIÓN: req.user.id
          user_id: new mongoose.Types.ObjectId(req.user.id), 
          items: lineItems,
          metodo_pago,
          
          direccion_envio: {
             calle: direccionSeleccionada.calle,
             numero: direccionSeleccionada.numero_exterior,
             colonia: direccionSeleccionada.colonia,
             cp: direccionSeleccionada.codigo_postal,
             estado: direccionSeleccionada.estado,
             ciudad: direccionSeleccionada.municipio,
             telefono: direccionSeleccionada.telefono
          },
          
          metodo_envio: shipping_method,
          costo_envio: costoEnvio,
          
          subtotal,
          iva,
          total,
          
          status: "pagado", 
          createdAt: now,
          created_by_role: req.user?.role || "user",
        };

        const orderRes = await ordersCol.insertOne(orderDoc, { session });
        orderId = orderRes.insertedId.toString();

        const invoicesCol = mongoose.connection.collection("invoices");
        const invoiceDoc = {
          order_id: orderRes.insertedId,
          subtotal,
          costo_envio: costoEnvio,
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

    return res.status(201).json({
      success: true,
      message: "Compra realizada con éxito",
      order_id: orderId,
      invoice_id: invoiceId,
      total_pagado: subtotal 
    });

  } catch (e) {
    if (typeof e.message === "string" && e.message.startsWith("INSUFFICIENT:")) {
      const parts = e.message.split(":");
      return res.status(409).json({ success: false, error: `Stock insuficiente para ${parts[1]}.` });
    }
    if (typeof e.message === "string" && e.message.startsWith("SKU_NOT_FOUND:")) {
      const parts = e.message.split(":");
      return res.status(404).json({ success: false, error: `Producto no encontrado: ${parts[1]}` });
    }
    if (e.message === "BAD_ITEM") {
      return res.status(400).json({ success: false, error: "Datos de producto inválidos en el carrito." });
    }

    console.error("Error en checkoutCompra:", e);
    return res.status(500).json({ success: false, error: "Error procesando la compra. Intente nuevamente." });
  }
};

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
        
        try {
          await session.withTransaction(async () => {
            const lineItems = [];
            for (const it of items) {
              const { sku, size, cantidad } = it || {};
              if (!sku || !size || typeof cantidad !== "number" || cantidad <= 0) {
                throw new Error("BAD_ITEM");
              }
    
              const product = await Product.findOne({ "variants.sku": sku }, null, { session });
              if (!product) throw new Error(`SKU_NOT_FOUND:${sku}`);
    
              const precioUnit = Number(product.salePrice || product.price);
    
              const updateRes = await Product.updateOne(
                {
                  _id: product._id,
                  "variants.sku": sku,
                  "variants.sizes.size": size,
                  "variants.sizes.stock": { $gte: cantidad },
                },
                { $inc: { "variants.$[v].sizes.$[s].stock": -cantidad } },
                {
                  arrayFilters: [{ "v.sku": sku }, { "s.size": size }],
                  session,
                }
              );
    
              if (updateRes.modifiedCount === 0) throw new Error(`INSUFFICIENT:${sku}/${size}`);
    
              subtotal += precioUnit * cantidad;
              lineItems.push({ sku, size, cantidad, precio_unitario: precioUnit });
            }
    
            const iva = Math.round(subtotal * 0.16 * 100) / 100;
            const total = subtotal + iva;
            const now = new Date();
    
            const ordersCol = mongoose.connection.collection("orders");
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
              // CORRECCIÓN: req.user.id
              cajero_id: req.user.id,
              cajero_nombre: req.user?.nombre
            };
    
            const orderRes = await ordersCol.insertOne(orderDoc, { session });
            orderId = orderRes.insertedId.toString();
    
            const invoicesCol = mongoose.connection.collection("invoices");
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
            await ticketsCol.insertOne({
                order_id: orderRes.insertedId,
                invoice_id: invRes.insertedId,
                items: lineItems,
                total_pagado: total,
                createdAt: now
            }, { session });
          });
        } finally {
          session.endSession();
        }
        return res.status(201).json({ success: true, order_id: orderId, invoice_id: invoiceId });
      } catch (e) {
        console.error("Error POS:", e);
        return res.status(500).json({ error: e.message });
      }
};

// Listar órdenes del usuario
export const listUserOrders = async (req, res) => {
  try {
    // CORRECCIÓN: req.user.id
    const userId = req.user.id;
    const _idUser = new mongoose.Types.ObjectId(userId);

    const ordersCol = mongoose.connection.collection("orders");
    const cursor = ordersCol
      .find({ user_id: _idUser }, { projection: { _id: 1, createdAt: 1, total: 1, status: 1, items: 1 } })
      .sort({ createdAt: -1 });
    const docs = await cursor.toArray();

    const data = docs.map((d) => ({
      order_id: d._id.toString(),
      fecha: d.createdAt instanceof Date ? d.createdAt.toISOString() : String(d.createdAt),
      total: d.total,
      estatus: d.status === "pagado" ? "Pagado" : String(d.status || ""),
      items_count: d.items ? d.items.length : 0
    }));
    return res.status(200).json(data);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Error listando órdenes" });
  }
};

// Obtener detalle de orden
export const getUserOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ error: "ID de orden inválido" });
    }
    const _id = new mongoose.Types.ObjectId(orderId);
    
    // CORRECCIÓN: req.user.id
    const _userId = new mongoose.Types.ObjectId(req.user.id);

    const ordersCol = mongoose.connection.collection("orders");
    const order = await ordersCol.findOne({ _id });

    if (!order) {
      return res.status(404).json({ error: "Orden no encontrada" });
    }
    
    // Seguridad: Verificar que la orden pertenezca al usuario
    if (!order.user_id || order.user_id.toString() !== _userId.toString()) {
        return res.status(403).json({ error: "No tienes permiso para ver esta orden" });
    }

    return res.status(200).json({
      order_id: order._id.toString(),
      items: order.items,
      total: order.total,
      subtotal: order.subtotal,
      costo_envio: order.costo_envio || 0,
      direccion_envio: order.direccion_envio, 
      estatus: order.status,
      fecha: order.createdAt
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Error obteniendo la orden" });
  }
};