import bcrypt from "bcrypt";
import mongoose from "mongoose";

// modelo
import Usuario from "../../models/users/usuario.js";

const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || "10", 10);

const NORMALIZE_ROLE = (r) => (typeof r === "string" ? r.trim().toLowerCase() : r);
const ALLOWED_INTERNAL_ROLES = new Set(["cajero", "admon_inventario", "admon_roles"]);

// POST /api/admin/users
export const createInternalUser = async (req, res) => {
  try {
    const { email, password, nombre, apellido, role } = req.body || {};

    if (!email || !password || !nombre) {
      return res.status(400).json({ success: false, message: "Faltan datos (email, password, nombre)" });
    }

    const userRole = NORMALIZE_ROLE(role);
    if (!ALLOWED_INTERNAL_ROLES.has(userRole)) {
      return res.status(400).json({ success: false, message: "Rol inválido" });
    }

    const exists = await Usuario.findOne({ email });
    if (exists) {
      return res.status(409).json({ success: false, message: "El usuario ya existe" });
    }

    const hash = await bcrypt.hash(password, saltRounds);

    const nuevo = await Usuario.create({
      email,
      password: hash,
      nombre,
      apellido: apellido && typeof apellido === "string" && apellido.trim().length > 0 ? apellido : "N/A",
      role: userRole,
      emailVerified: true
    });

    return res.status(201).json({ user_id: nuevo._id.toString() });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: "Error creando usuario" });
  }
};

// DELETE /api/admin/users/:id
export const deleteInternalUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: "ID requerido" });

    let _id;
    try {
      _id = new mongoose.Types.ObjectId(id);
    } catch {
      return res.status(400).json({ success: false, message: "ID inválido" });
    }

    const deleted = await Usuario.findByIdAndDelete(_id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Usuario no encontrado" });
    }

    return res.status(200).json({ message: "Usuario eliminado correctamente." });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: "Error eliminando usuario" });
  }
};

// GET /api/admin/users obtener empleados
const INTERNAL_ROLES = ["cajero", "admon_inventario", "admon_roles"];

export const listInternalUsers = async (req, res) => {
  try {
    // CAMBIO CLAVE: En lugar de { role: { $ne: "user" } }, usamos $in para ser explícitos.
    // Esto es más seguro y rápido (si el campo role está indexado).
    const query = { role: { $in: INTERNAL_ROLES } };

    const users = await Usuario.find(query)
      .select("nombre apellido email role createdAt emailVerified")
      .sort({ createdAt: -1 });

    // Mapeamos para limpiar un poco la respuesta si es necesario
    const data = users.map((u) => ({
      id: u._id,
      nombre: u.nombre,
      apellido: u.apellido,
      email: u.email,
      role: u.role, // 'cajero', 'admon_inventario', etc.
      fecha_alta: u.createdAt,
      activo: u.emailVerified // Usamos esto como indicador de estado por ahora
    }));

    return res.status(200).json(data);
  } catch (e) {
    console.error("Error listando empleados:", e);
    return res.status(500).json({ success: false, message: "Error al obtener la lista de personal" });
  }
};