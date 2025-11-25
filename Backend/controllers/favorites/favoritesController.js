import Favorite from "../../models/favorites/Favorite.js";
import Product from "../../models/product/Product.js"; // Necesario para populate

// GET /api/favorites
export const getFavorites = async (req, res) => {
  try {
    // Buscamos la lista del usuario y "rellenamos" (populate) los datos de los productos
    const favDoc = await Favorite.findOne({ user: req.userId }).populate({
      path: 'products',
      select: 'name brand price salePrice variants.images variants.sku' // Traemos solo datos esenciales
    });

    if (!favDoc) {
      return res.status(200).json({ favorites: [], favoriteIds: [] });
    }

    // Devolvemos los objetos completos (para la página) y los IDs solos (para los botones)
    const favoriteIds = favDoc.products.map(p => p._id.toString());

    res.status(200).json({ 
      favorites: favDoc.products, 
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
      { user: req.userId },
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
      { user: req.userId },
      { $pull: { products: productId } } // $pull elimina el ID del arreglo
    );
    res.status(200).json({ message: "Eliminado de favoritos" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al eliminar favorito" });
  }
};