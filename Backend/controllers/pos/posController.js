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
