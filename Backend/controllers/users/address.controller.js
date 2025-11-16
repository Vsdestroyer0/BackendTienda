// Ruta: Backend/controllers/users/address.controller.js

// Esta ruta de importación sube dos niveles (fuera de 'users' y 'controllers')
// y luego baja a 'models/users/address.model.js'. Es correcta.
import Address from '../../models/users/address.model.js';

// --- 1. CREAR una nueva dirección ---
export const createAddress = async (req, res) => {
  try {
    // Obtenemos los datos del cuerpo (body) de la petición
    const {
      recipientName,
      phone,
      street,
      neighborhood,
      zipCode,
      city,
      state,
    } = req.body;

    // Creamos una nueva instancia de la dirección
    const newAddress = new Address({
      // req.user.id viene de tu middleware 'VerifyToken'
      user: req.user.id,
      recipientName,
      phone,
      street,
      neighborhood,
      zipCode,
      city,
      state,
    });

    // Guardamos la dirección en la base de datos
    const savedAddress = await newAddress.save();

    // Respondemos al frontend con la dirección creada
    res.status(201).json(savedAddress);
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Error al crear la dirección', error: error.message });
  }
};

// --- 2. OBTENER TODAS las direcciones del usuario logueado ---
export const getAddresses = async (req, res) => {
  try {
    // Buscamos en la base de datos TODAS las direcciones
    // que tengan el ID del usuario logueado.
    const addresses = await Address.find({ user: req.user.id });

    // Si no encuentra, regresa un arreglo vacío (lo cual está bien)
    res.json(addresses);
  } catch (error) {
    res.status(500).json({
      message: 'Error al obtener las direcciones',
      error: error.message,
    });
  }
};

// --- 3. OBTENER UNA SOLA dirección (por su ID) ---
export const getAddress = async (req, res) => {
  try {
    const address = await Address.findById(req.params.id);
    if (!address) {
      return res.status(404).json({ message: 'Dirección no encontrada' });
    }

    // Seguridad: Verificamos que la dirección encontrada pertenezca al usuario logueado
    if (address.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'No autorizado' });
    }

    res.json(address);
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Error al obtener la dirección', error: error.message });
  }
};

// --- 4. ACTUALIZAR una dirección existente ---
export const updateAddress = async (req, res) => {
  try {
    const address = await Address.findById(req.params.id);
    if (!address) {
      return res.status(404).json({ message: 'Dirección no encontrada' });
    }

    // Seguridad: Verificamos que el usuario solo pueda actualizar SUS direcciones
    if (address.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'No autorizado' });
    }

    // Actualizamos la dirección encontrada con los datos nuevos
    const updatedAddress = await Address.findByIdAndUpdate(
      req.params.id, // ID de la dirección a actualizar
      req.body, // Datos nuevos (vienen del formulario del frontend)
      { new: true } // Opción para que nos devuelva el documento actualizado
    );

    res.json(updatedAddress);
  } catch (error) {
    res.status(500).json({
      message: 'Error al actualizar la dirección',
      error: error.message,
    });
  }
};

// --- 5. BORRAR una dirección ---
export const deleteAddress = async (req, res) => {
  try {
    const address = await Address.findById(req.params.id);
    if (!address) {
      return res.status(404).json({ message: 'Dirección no encontrada' });
    }

    // Seguridad: Verificamos que el usuario solo pueda borrar SUS direcciones
    if (address.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'No autorizado' });
    }

    // Borramos la dirección
    await Address.findByIdAndDelete(req.params.id);

    // Respondemos con un "Todo bien, sin contenido"
    res.sendStatus(204);
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Error al borrar la dirección', error: error.message });
  }
};