// seedUser.js
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import Usuario from './Backend/models/users/usuario.js'; // Importa tu modelo de usuario

// Carga las variables de entorno (MONGODB_URI, BCRYPT_SALT_ROUNDS)
dotenv.config();

// --- Define tu usuario de prueba aquí ---
const TEST_USER = {
  nombre: 'Cliente',
  apellido: 'De Prueba',
  email: 'cliente@prueba.com',
  password: 'password123', // La contraseña que usarás para loguearte
  role: 'user',
  emailVerified: true // ¡La parte clave!
};
// ------------------------------------

const runSeed = async () => {
  console.log('Iniciando script de seed...');

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('Error: MONGODB_URI no encontrada en .env');
    process.exit(1);
  }

  try {
    // 1. Conectar a la BD
    await mongoose.connect(uri);
    console.log('Conectado a MongoDB.');

    // 2. Hashear la contraseña (el backend NUNCA guarda contraseñas en texto plano)
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10');
    const hashedPassword = await bcrypt.hash(TEST_USER.password, saltRounds);
    console.log('Contraseña hasheada.');

    // 3. Borrar usuario si ya existe (para que el script sea repetible)
    const existingUser = await Usuario.findOne({ email: TEST_USER.email });
    if (existingUser) {
      console.log('Usuario de prueba existente encontrado. Eliminando...');
      await Usuario.deleteOne({ email: TEST_USER.email });
    }

    // 4. Crear el nuevo usuario verificado
    console.log('Creando nuevo usuario de prueba...');
    await Usuario.create({
      nombre: TEST_USER.nombre,
      apellido: TEST_USER.apellido,
      email: TEST_USER.email,
      password: hashedPassword,
      role: TEST_USER.role,
      emailVerified: TEST_USER.emailVerified
    });

    console.log('--------------------------------------------------');
    console.log('¡Éxito! Usuario de prueba creado:');
    console.log(`  Email: ${TEST_USER.email}`);
    console.log(`  Password: ${TEST_USER.password}`);
    console.log('--------------------------------------------------');

  } catch (error) {
    console.error('Error durante el script de seed:', error);
  } finally {
    // 5. Desconectar de la BD
    await mongoose.disconnect();
    console.log('Desconectado de MongoDB.');
  }
};

// Ejecutar el script
runSeed();