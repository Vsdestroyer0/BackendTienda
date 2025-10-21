import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;

export default async function connectDB() {
    try {
        await mongoose.connect(uri);
        console.log("Conectado a base de datos MongoDB");
    } catch (error) {
        console.error("Error conectando a MongoDB:", error);
        process.exit(1);
    }
};