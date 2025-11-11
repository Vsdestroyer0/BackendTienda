// ...
import mongoose from "mongoose";


const sizeSchema = new mongoose.Schema({
    size: { type: String, required: true },
    stock: { type: Number, required: true, default: 0 }
});

const variantSchema = new mongoose.Schema({
    colorName: { type: String, required: true },
    colorHex: { type: String },
    sku: { type: String, required: true, unique: true },
    images: [{ type: String }],
    sizes: [sizeSchema] // <-- Arreglo de tallas anidado
});

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    brand: { type: String, required: true },
    // ... (price, description, etc.) ...

    // ESTA ES LA LÍNEA CRÍTICA:
    variants: [variantSchema], // <-- El arreglo que espera el frontend

    details: [{
        title: { type: String },
        content: { type: String }
    }],
    reviews: {
        averageRating: { type: Number, default: 0 },
        reviewCount: { type: Number, default: 0 }
    },
    // ...
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);
export default Product;