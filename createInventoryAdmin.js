import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import connectDB from "./db.js";
import Usuario from "./Backend/models/users/usuario.js";

dotenv.config();

const createInvAdmin = async () => {
    console.log("Conectando a la base de datos...");
    await connectDB();

    try {
        const invEmail = "inventario@tienda.com";
        const invPassword = "inventario123";

        // 1. Revisar si ya existe
        const existingAdmin = await Usuario.findOne({ email: invEmail });
        if (existingAdmin) {
            console.log("El usuario de inventario ya existe.");
            return;
        }

        // 2. Hashear la contraseña
        const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || 10);
        const hash = await bcrypt.hash(invPassword, saltRounds);

        // 3. Crear el nuevo usuario
        const invAdminUser = new Usuario({
            nombre: "Admin",
            apellido: "Inventario",
            email: invEmail,
            password: hash,
            role: "admon_inventario", // <-- El rol correcto
            emailVerified: true, // Lo marcamos como verificado
        });

        // 4. Guardar en la BD
        await invAdminUser.save();
        console.log("¡Usuario Admin de Inventario creado con éxito!");
        console.log(`Email: ${invEmail}`);
        console.log(`Password: ${invPassword}`);

    } catch (error) {
        console.error("Error al crear el admin de inventario:", error);
    } finally {
        // 5. Desconectar
        await mongoose.connection.close();
        console.log("Desconectado de la base de datos.");
    }
};

createInvAdmin();