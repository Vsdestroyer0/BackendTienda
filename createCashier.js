import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import connectDB from "./db.js";
import Usuario from "./Backend/models/users/usuario.js";

dotenv.config();

const createCashier = async () => {
    console.log("Conectando a la base de datos...");
    await connectDB();

    try {
        const cashierEmail = "cajero@tienda.com";
        const cashierPassword = "cajero123";

        // revisar si ya existe
        const existingCashier = await Usuario.findOne({ email: cashierEmail });
        if (existingCashier) {
            console.log("El usuario cajero ya existe.");
            return;
        }

        // hashear la contraseña 
        const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || 10);
        const hash = await bcrypt.hash(cashierPassword, saltRounds);

        const cashierUser = new Usuario({
            nombre: "Cajero",
            apellido: "Prueba",
            email: cashierEmail,
            password: hash,
            role: "cajero",
            emailVerified: true,
        });

        // guardar en la BD
        await cashierUser.save();
        console.log("¡Usuario cajero creado con éxito!");
        console.log(`Email: ${cashierEmail}`);
        console.log(`Password: ${cashierPassword}`);

    } catch (error) {
        console.error("Error al crear el cajero:", error);
    } finally {
        // desconectar
        await mongoose.connection.close();
        console.log("Desconectado de la base de datos.");
    }
};

createCashier();