// Importaciones de paquetes
import mongoose from "mongoose";

// Definición del esquema de usuario
const usuarioSchema = new mongoose.Schema({
    nombre: {type: String, required: true},
    apellido: {type: String, required: true},
    email: {type: String, required: true, unique: true},
    password: {type: String, required: true},
    role: {type: String, enum: ["user", "cajero", "admon_inventario", "admon_roles"], default: "user"},
    emailVerified: {type: Boolean, default: false},
    verificationToken: {tokenHashed: String, tokenExpiry: Date}
}, 
{
    // timestamps: true agrega automaticamente dos campos createdAt y updatedAt en la base de datos
    timestamps: true
});

// Creación del modelo de usuario
const Usuario = mongoose.model("Usuario", usuarioSchema);

// Exportación del modelo de usuario
export default Usuario;
