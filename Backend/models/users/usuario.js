// Importaciones de paquetes
import mongoose from "mongoose";

//esquema de direcciones 
const addressSchema = new mongoose.Schema({
    calle: { type: String, required: true },
    numero_exterior: { type: String, required: true },
    numero_interior: { type: String },
    colonia: { type: String, required: true },
    municipio: { type: String, required: true },
    estado: { type: String, required: true },
    codigo_postal: { type: String, required: true },
    telefono: { type: String, required: true },
    referencias: { type: String }
}, { _id: true });

// esquema de usuario
const usuarioSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    apellido: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    // Se cambia el password a false por los provedores de Google
    password: { type: String, required: false },
    role: { type: String, enum: ["user", "cajero", "admon_inventario", "admon_roles"], default: "user" },
    direcciones: [addressSchema],
    emailVerified: { type: Boolean, default: false },
    verificationToken: { tokenHashed: String, tokenExpiry: Date },
    //favorites: { type: [String], default: [] },
    passwordResetToken: { tokenHashed: String, tokenExpiry: Date },
    authProvider: { type: String, enum: ["local", "google"], default: "local" }
}, 
{
    // timestamps: true agrega automaticamente dos campos createdAt y updatedAt en la base de datos
    timestamps: true
});

// modelo de usuario
const Usuario = mongoose.model("Usuario", usuarioSchema);

// exportación del modelo
export default Usuario;
