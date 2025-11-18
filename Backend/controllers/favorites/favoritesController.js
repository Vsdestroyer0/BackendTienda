// Backend/controllers/favorites/favoritesController.js
import Usuario from "../../models/users/usuario.js";
import mongoose from "mongoose";

// GET /api/favorites - Obtener la lista de SKUs favoritos
export const getFavorites = async (req, res) => {
  try {
    const user = await Usuario.findById(req.userId).select("favorites").lean();
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    
    // Opcional: Enriquecer los favoritos con datos del producto
    // Por simplicidad, primero devolvemos solo los SKUs.
    // Si necesitas los datos completos, se implementa aquí.
    
    res.status(200).json({ favorites: user.favorites || [] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error obteniendo favoritos" });
  }
};

// POST /api/favorites - Añadir un favorito
// body: { sku: "string" }
export const addFavorite = async (req, res) => {
  const { sku } = req.body;
  if (!sku) {
    return res.status(400).json({ error: "SKU es requerido" });
  }

  try {
    await Usuario.updateOne(
      { _id: req.userId },
      // $addToSet es como $push, pero evita duplicados
      { $addToSet: { favorites: sku } } 
    );
    res.status(200).json({ message: "Favorito añadido" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error añadiendo favorito" });
  }
};

// DELETE /api/favorites/:sku - Eliminar un favorito
export const removeFavorite = async (req, res) => {
  const { sku } = req.params;
  if (!sku) {
    return res.status(400).json({ error: "SKU es requerido" });
  }

  try {
    await Usuario.updateOne(
      { _id: req.userId },
      // $pull elimina un elemento de un array
      { $pull: { favorites: sku } }
    );
    res.status(200).json({ message: "Favorito eliminado" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error eliminando favorito" });
  }
};