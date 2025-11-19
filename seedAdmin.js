import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import connectDB from "./db.js";
import Usuario from "./Backend/models/users/usuario.js";

dotenv.config();

const createAdmin = async () => {
    console.log("Conectando a la base de datos...");
    await connectDB();

    try {
        const adminEmail = "admin@tienda.com";
        const adminPassword = "123456";

        // revisar si ya existe
        const existingAdmin = await Usuario.findOne({ email: adminEmail });
        if (existingAdmin) {
            console.log("El usuario administrador ya existe.");
            return;
        }

        // hashear la contraseña 
        const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || 10);
        const hash = await bcrypt.hash(adminPassword, saltRounds);

        // crear nuevo admin
        const adminUser = new Usuario({
            nombre: "Admin",
            apellido: "Maestro",
            email: adminEmail,
            password: hash,
            role: "admon_roles",
            emailVerified: true, // xd
        });

        // guardar en la BD
        await adminUser.save();
        console.log("¡Usuario administrador creado con éxito!");
        console.log(`Email: ${adminEmail}`);
        console.log(`Password: ${adminPassword}`);

    } catch (error) {
        console.error("Error al crear el administrador:", error);
    } finally {
        //desconectar
        await mongoose.connection.close();
        console.log("Desconectado de la base de datos.");
    }
};

createAdmin();