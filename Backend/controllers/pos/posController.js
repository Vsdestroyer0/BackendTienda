// importaciones de paquetes
import mongoose from "mongoose";

// POST /api/pos/cierre-caja
// Body: { "total_ventas": number, "fecha_cierre": string(ISO), "detalle": ["..."] }
export const createCashClosure = async (req, res) => {
  try {
    const { total_ventas, fecha_cierre, detalle } = req.body || {};

    // Validaciones
    if (typeof total_ventas !== "number" || !Number.isFinite(total_ventas) || total_ventas < 0) {
      return res.status(400).json({ success: false, message: "'total_ventas' inválido" });
    }
    if (!fecha_cierre || typeof fecha_cierre !== "string") {
      return res.status(400).json({ success: false, message: "'fecha_cierre' requerido" });
    }
    const fecha = new Date(fecha_cierre);
    if (isNaN(fecha.getTime())) {
      return res.status(400).json({ success: false, message: "'fecha_cierre' inválida" });
    }
    if (detalle && (!Array.isArray(detalle) || !detalle.every((x) => typeof x === "string"))) {
      return res.status(400).json({ success: false, message: "'detalle' debe ser arreglo de strings" });
    }

    const closuresCol = mongoose.connection.collection("cash_closures");

    const doc = {
      cajero_id: req.userId,
      cajero_nombre: req.user?.nombre || "",
      total_ventas,
      fecha_cierre: fecha,
      detalle: Array.isArray(detalle) ? detalle : [],
      createdAt: new Date(),
    };

    const resInsert = await closuresCol.insertOne(doc);

    return res.status(201).json({ resumen_id: resInsert.insertedId.toString(), message: "Cierre de caja registrado correctamente." });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: "Error registrando cierre de caja" });
  }
};

// GET /api/pos/my-sales (solo cajero)
// Query opcional: ?page=1&limit=20
export const getMyPosSales = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const cajeroId = req.userId;

    const ordersCol = mongoose.connection.collection("orders");

    const filter = {
      created_by_role: "cajero",
      cajero_id: cajeroId,
      // Si quisieras solo ventas POS y no web, podrías filtrar también por direccion_envio: "VENTA_POS"
    };

    const totalCount = await ordersCol.countDocuments(filter);

    const cursor = ordersCol
      .find(filter, {
        projection: {
          _id: 1,
          total: 1,
          subtotal: 1,
          iva: 1,
          metodo_pago: 1,
          createdAt: 1,
        },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const docs = await cursor.toArray();

    const items = docs.map((d) => ({
      order_id: d._id.toString(),
      fecha:
        d.createdAt instanceof Date
          ? d.createdAt.toISOString()
          : String(d.createdAt),
      total: Number(d.total) || 0,
      subtotal: Number(d.subtotal) || 0,
      iva: Number(d.iva) || 0,
      metodo_pago: d.metodo_pago || "",
    }));

    const totalPages = Math.max(1, Math.ceil(totalCount / limit));

    return res.status(200).json({
      items,
      page,
      totalPages,
      totalCount,
    });
  } catch (e) {
    console.error("[getMyPosSales] Error:", e);
    return res
      .status(500)
      .json({ error: "Error obteniendo historial de ventas del cajero" });
  }
};

// POST /api/pos/refunds (solo cajero)
// Body: {
//   "invoice_id": "string",
//   "items": [{ "sku": "string", "size": "string", "cantidad": number }],
//   "motivo": "string"
// }
export const createPosRefund = async (req, res) => {
  try {
    const { invoice_id, items, motivo } = req.body || {};

    if (!invoice_id || typeof invoice_id !== "string") {
      return res
        .status(400)
        .json({ success: false, message: "'invoice_id' requerido" });
    }

    if (!Array.isArray(items)) {
      return res
        .status(400)
        .json({ success: false, message: "'items' inválidos" });
    }

    for (const it of items) {
      if (
        !it ||
        typeof it.sku !== "string" ||
        typeof it.size !== "string" ||
        typeof it.cantidad !== "number" ||
        it.cantidad <= 0
      ) {
        return res
          .status(400)
          .json({ success: false, message: "'items' inválidos" });
      }
    }

    const invoicesCol = mongoose.connection.collection("invoices");
    const ordersCol = mongoose.connection.collection("orders");
    const refundsCol = mongoose.connection.collection("refunds");
    const ticketsCol = mongoose.connection.collection("tickets");
    const productsCol = mongoose.connection.collection("products");

    let _invoiceId;
    try {
      _invoiceId = new mongoose.Types.ObjectId(invoice_id);
    } catch {
      return res
        .status(400)
        .json({ success: false, message: "invoice_id inválido" });
    }

    let invoice = await invoicesCol.findOne({ _id: _invoiceId });

    // Si no se encuentra la factura directamente, interpretamos que el 'invoice_id'
    // que llegó desde el frontend podría ser en realidad el folio de ticket (ticket_id).
    if (!invoice) {
      const ticket = await ticketsCol.findOne({ _id: _invoiceId });
      if (ticket && ticket.invoice_id) {
        invoice = await invoicesCol.findOne({ _id: ticket.invoice_id });
      }
    }

    if (!invoice) {
      return res
        .status(404)
        .json({ success: false, message: "Factura no encontrada" });
    }

    const order = await ordersCol.findOne({ _id: invoice.order_id });
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Orden asociada no encontrada" });
    }

    // Opcional: validar que solo el cajero original pueda hacer el reembolso
    // if (order.cajero_id && String(order.cajero_id) !== String(req.userId)) { ... }

    const session = await mongoose.startSession();
    let totalReembolsado = 0;
    let refundId = null;

    try {
      await session.withTransaction(async () => {
        const lineItems = order.items || [];

        // Si el arreglo items viene vacío, interpretamos "reembolso total" usando los items de la orden
        const effectiveItems = items.length
          ? items
          : lineItems.map((li) => ({
              sku: li.sku,
              size: li.size,
              cantidad: li.cantidad,
            }));

        for (const reqItem of effectiveItems) {
          const match = lineItems.find(
            (li) => li.sku === reqItem.sku && li.size === reqItem.size
          );
          if (!match) {
            throw new Error(`ITEM_NOT_FOUND:${reqItem.sku}/${reqItem.size}`);
          }
          const precioUnit = Number(match.precio_unitario) || 0;
          totalReembolsado += precioUnit * reqItem.cantidad;

          // Devolver stock a la talla correspondiente
          await productsCol.updateOne(
            {
              "variants.sku": reqItem.sku,
              "variants.sizes.size": reqItem.size,
            },
            {
              $inc: { "variants.$[v].sizes.$[s].stock": reqItem.cantidad },
            },
            {
              arrayFilters: [
                { "v.sku": reqItem.sku },
                { "s.size": reqItem.size },
              ],
              session,
            }
          );
        }

        const refundDoc = {
          order_id: order._id,
          invoice_id: invoice._id,
          cajero_id: req.userId,
          cajero_nombre: req.user?.nombre || "",
          items: items.length
            ? items
            : lineItems.map((li) => ({
                sku: li.sku,
                size: li.size,
                cantidad: li.cantidad,
              })),
          totalReembolsado,
          motivo: typeof motivo === "string" ? motivo : "",
          createdAt: new Date(),
        };

        const resInsert = await refundsCol.insertOne(refundDoc, { session });
        refundId = resInsert.insertedId.toString();
      });
    } finally {
      session.endSession();
    }

    return res.status(201).json({
      refund_id: refundId,
      totalReembolsado,
    });
  } catch (e) {
    console.error("[createPosRefund] Error:", e);
    return res
      .status(500)
      .json({ success: false, message: "Error registrando reembolso POS" });
  }
};
