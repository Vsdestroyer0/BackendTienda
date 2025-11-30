import Usuario from "../../models/users/usuario.js";

// GET /api/users/addresses
export const getAddresses = async (req, res) => {
  try {
    // req.userId viene del middleware VerifyToken
    const user = await Usuario.findById(req.user.id).select("direcciones");
    
    if (!user) {
      return res.status(404).json({ success: false, message: "Usuario no encontrado" });
    }

    return res.status(200).json({ 
      success: true, 
      direcciones: user.direcciones || [] 
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Error al obtener direcciones" });
  }
};

// POST /api/users/addresses
export const addAddress = async (req, res) => {
  console.log("addAddress llamado");
  try {
    const newAddress = req.body; // { calle, numero, cp, ... }

    console.log("Intentando guardar dirección...");
    console.log("Usuario ID (del token):", req.user?.id);
    console.log("Datos recibidos (body):", newAddress);

    // Validación básica (puedes mejorarla con Zod o express-validator)
    if (!newAddress.calle || !newAddress.codigo_postal || !newAddress.estado) {
      console.log("Faltan campos obligatorios");
      return res.status(400).json({ success: false, message: "Faltan campos obligatorios de la dirección" });
    }
    // Usamos $push para agregar al array sin sobrescribir
    const user = await Usuario.findByIdAndUpdate(
      req.user.id,
      { $push: { direcciones: newAddress } },
      { new: true } // Para que devuelva el usuario actualizado
    );

    console.log("Resultado de búsqueda en BD:", user ? "Usuario encontrado" : "Usuario NULL");

    if (!user) {
        return res.status(404).json({ success: false, message: "Usuario no encontrado al guardar" });
    }

    // Devolvemos la última dirección agregada (que tendrá su _id generado)
    const addedAddress = user.direcciones[user.direcciones.length - 1];

    return res.status(201).json({ 
      success: true, 
      message: "Dirección agregada", 
      direccion: addedAddress 
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Error al guardar la dirección" });
  }
};

// DELETE /api/users/addresses/:id (Opcional, pero útil)
export const deleteAddress = async (req, res) => {
    try {
        const { id } = req.params;
        await Usuario.findByIdAndUpdate(req.userId, {
            $pull: { direcciones: { _id: id } }
        });
        return res.status(200).json({ success: true, message: "Dirección eliminada" });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Error al eliminar dirección" });
    }
};