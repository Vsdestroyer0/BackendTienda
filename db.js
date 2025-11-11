import "dotenv/config";
import mongoose from "mongoose";

const connectDB = async () => {

  const isProduction = process.env.NODE_ENV === 'production';
  const dbUri = isProduction
    ? process.env.MONGODB_URI
    : process.env.MONGODB_URI_LOCAL; //esto fue lo que agregue

  if (!dbUri) {
    console.error("Error: MONGODB_URI o MONGODB_URI_LOCAL no encontrado en .env");
    process.exit(1);
  }

  try {
    await mongoose.connect(dbUri);

    if (isProduction) {
      console.log("[Mongo] Conectado a MongoDB Atlas (Producción)");
    } else {
      console.log("[Mongo] Conectado a MongoDB Local (Desarrollo)");
    }

  } catch (error) {
    console.error(`Error de conexión a MongoDB: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
// dotenv config sirve para cargar las variables de entorno, es decir, las variables que se encuentran en el archivo .env