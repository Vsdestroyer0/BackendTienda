import mongoose from "mongoose";

const uri = "mongodb://localhost:27017/Tienda";

export default async function connectDB() {
    try {
        await mongoose.connect(uri);
        console.log("Conectado a base de datos MongoDB");
    } catch (error) {
        console.error("Error conectando a MongoDB:", error);
        process.exit(1);
    }
};