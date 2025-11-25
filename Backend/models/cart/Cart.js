import mongoose from "mongoose";

// Sub-esquema para los items del carrito
// A diferencia de favoritos que es solo [ObjectId], aquí es un objeto con propiedades
const cartItemSchema = new mongoose.Schema({
    product: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Product', // Referencia para hacer populate (igual que en favoritos)
        required: true 
    },
    sku: { type: String, required: true },
    size: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 }
}, { _id: false }); // No necesitamos _id para este sub-documento

const cartSchema = new mongoose.Schema({
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Usuario', 
        required: true, 
        unique: true // Un carrito por usuario
    },
    items: [cartItemSchema] // Arreglo de items
}, { timestamps: true });

const Cart = mongoose.model("Cart", cartSchema);
export default Cart;