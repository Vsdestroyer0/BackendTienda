// Importaciones de paquetes
import "dotenv/config";
import mongoose from "mongoose";

// Funcion para conectar a la base de datos
export default async function connectDB() {
  try {
    const uri = process.env.MONGODB_URI;
    await mongoose.connect(uri);
    console.log("Conectado a base de datos MongoDB");
  } catch (error) {
    console.error("Error conectando a MongoDB:", error);
    process.exit(1);
  }
}

// dotenv config sirve para cargar las variables de entorno, es decir, las variables que se encuentran en el archivo .env