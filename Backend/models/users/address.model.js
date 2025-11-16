import { Schema, model, Types } from 'mongoose';

// 1. Definimos el Schema (la estructura)
const addressSchema = new Schema(
  {
    // 2. Creamos el VÍNCULO con el Usuario.
    user: {
      type: Types.ObjectId, // Almacena el ID del usuario
      
      // DEBE COINCIDIR con el nombre de tu modelo de usuario
      ref: 'Usuario',         
      
      required: true,
    },
    
    // --- Campos del formulario de dirección ---

    recipientName: {
      type: String,
      required: true,
      trim: true,
    },
    
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    
    street: {
      type: String,
      required: true,
      trim: true,
    },
    
    neighborhood: {
      type: String,
      required: true,
      trim: true,
    },
    
    zipCode: {
      type: String,
      required: true,
      trim: true,
    },
    
    city: {
      type: String,
      required: true,
      trim: true,
    },
    
    state: {
      type: String,
      required: true,
      trim: true,
    },

    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// 4. Exportamos el modelo
const Address = model('Address', addressSchema);
export default Address;