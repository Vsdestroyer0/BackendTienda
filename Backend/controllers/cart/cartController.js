import Cart from "../../models/cart/Cart.js";
import Product from "../../models/product/Product.js";

// GET /api/cart
// Lógica similar a getFavorites: buscamos y hacemos populate
export const getCart = async (req, res) => {
  try {
    const userId = req.user.id; // Asegúrate de usar req.user.id que viene del token

    // 1. Buscamos el carrito y hacemos populate de los datos del producto base
    const cart = await Cart.findOne({ user: userId }).populate({
      path: 'items.product',
      select: 'name brand price salePrice variants' // Traemos info para mostrar en el front
    });

    if (!cart) {
      return res.status(200).json({ items: [] });
    }

    // 2. Procesamos los items para "aplanar" la info que el front necesita
    // (Similar a como mapeas en el frontend de favoritos, pero lo hacemos aquí para enviar el JSON listo)
    const formattedItems = cart.items.reduce((acc, item) => {
      const productData = item.product;
      
      // Si el producto fue borrado de la BD, no lo enviamos
      if (!productData) return acc;

      // Buscamos la variante específica (foto) correspondiente al SKU guardado
      const variant = productData.variants.find(v => v.sku === item.sku);
      
      acc.push({
        sku: item.sku,
        size: item.size,
        quantity: item.quantity,
        // Datos populados del producto padre
        name: productData.name,
        brand: productData.brand,
        price: productData.salePrice || productData.price, 
        image: variant?.images?.[0] || '/placeholder-shoe.jpg',
        productId: productData._id 
      });
      return acc;
    }, []);

    return res.status(200).json({ items: formattedItems });

  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: "Error obteniendo carrito" });
  }
};

// POST /api/cart
// Recibe: { sku, size, quantity }
export const addToCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { sku, size, quantity } = req.body;

    if (!sku || !size || !quantity) {
      return res.status(400).json({ success: false, message: "Faltan datos (sku, size, quantity)" });
    }

    // 1. Necesitamos el _id del producto para la referencia (como en favoritos)
    // Buscamos el producto que tenga ese SKU en sus variantes
    const product = await Product.findOne(
      { "variants.sku": sku },
      { _id: 1 }
    );

    if (!product) {
      return res.status(404).json({ success: false, message: "Producto no encontrado" });
    }

    // 2. Buscamos el carrito del usuario
    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      // CASO 1: No tiene carrito, creamos uno nuevo (Similar a crear el doc de Favoritos por primera vez)
      cart = new Cart({
        user: userId,
        items: [{
          product: product._id, // Enlace para populate
          sku,
          size,
          quantity
        }]
      });
    } else {
      // CASO 2: Ya tiene carrito, verificamos si el item ya existe
      const itemIndex = cart.items.findIndex(p => p.sku === sku && p.size === size);

      if (itemIndex > -1) {
        // Si existe: Actualizamos cantidad
        cart.items[itemIndex].quantity += quantity;
      } else {
        // Si no existe: Agregamos al arreglo (Como el $addToSet de favoritos, pero manual)
        cart.items.push({
          product: product._id,
          sku,
          size,
          quantity
        });
      }
    }

    await cart.save();
    return res.status(200).json({ message: "Producto agregado al carrito" });

  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: "Error agregando al carrito" });
  }
};

// DELETE /api/cart/:sku/:size
// Lógica similar a removeFavorite ($pull), pero el criterio es compuesto (sku + size)
export const removeFromCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { sku, size } = req.params; // Usamos params para identificar qué borrar

    await Cart.findOneAndUpdate(
      { user: userId },
      { 
        $pull: { items: { sku: sku, size: size } } 
      }
    );

    return res.status(200).json({ message: "Producto eliminado" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: "Error eliminando del carrito" });
  }
};

// PUT /api/cart/:sku/:size 
// Para actualizar cantidad desde el carrito (+ / -)
export const updateCartItem = async (req, res) => {
    try {
      const userId = req.user.id;
      const { sku, size } = req.params;
      const { quantity } = req.body;
  
      // Usamos el operador posicional $ para actualizar el elemento específico del array
      await Cart.findOneAndUpdate(
        { user: userId, "items.sku": sku, "items.size": size },
        { 
            $set: { "items.$.quantity": quantity }
        }
      );
  
      return res.status(200).json({ message: "Cantidad actualizada" });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ success: false, message: "Error actualizando carrito" });
    }
};