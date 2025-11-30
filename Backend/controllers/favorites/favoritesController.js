import Favorite from "../../models/favorites/Favorite.js";
import Product from "../../models/product/Product.js"; // Necesario para populate

// GET /api/favorites
export const getFavorites = async (req, res) => {
  try {
    const favDoc = await Favorite.findOne({ user: req.user.id }).populate({
      path: 'products',
      select: 'name brand price salePrice variants.images variants.sku'
    });

    if (!favDoc) {
      return res.status(200).json({ favorites: [], favoriteIds: [] });
    }


    // Filtramos productos que sean null (borrados de la BD) para evitar crash
    const validProducts = favDoc.products.filter(p => p !== null);

    const favoriteIds = validProducts.map(p => p._id.toString());

    res.status(200).json({
      favorites: validProducts,
      favoriteIds: favoriteIds
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error obteniendo favoritos" });
  }
};

// POST /api/favorites
export const addFavorite = async (req, res) => {
  const { productId } = req.body; // CAMBIO IMPORTANTE: Recibimos productId (_id), no SKU

  if (!productId) {
    return res.status(400).json({ error: "ID de producto requerido" });
  }

  try {
    // findOneAndUpdate con upsert: true crea el documento si no existe
    // $addToSet agrega el ID al arreglo solo si no existe (evita duplicados)
    await Favorite.findOneAndUpdate(
      { user: req.user.id },
      { $addToSet: { products: productId } },
      { new: true, upsert: true }
    );

    res.status(200).json({ message: "Añadido a favoritos" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al añadir favorito" });
  }
};

// DELETE /api/favorites/:productId
export const removeFavorite = async (req, res) => {
  const { productId } = req.params; // Recibimos productId

  try {
    await Favorite.findOneAndUpdate(
      { user: req.user.id },
      { $pull: { products: productId } } // $pull elimina el ID del arreglo
    );
    res.status(200).json({ message: "Eliminado de favoritos" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al eliminar favorito" });
  }
};