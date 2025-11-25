import mongoose from "mongoose";

const favoriteSchema = new mongoose.Schema({
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Usuario', 
        required: true, 
        unique: true // Un usuario solo tiene UN documento de lista de favoritos
    },
    products: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Product' // Enlace directo a la colección de productos
    }]
}, { timestamps: true });

const Favorite = mongoose.model("Favorite", favoriteSchema);
export default Favorite;