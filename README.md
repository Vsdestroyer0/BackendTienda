# Backend de Tienda

Backend desarrollado con Node.js, Express y MongoDB para gestionar una tienda en línea con sistema de autenticación, gestión de inventario, pedidos y carrito de compras.

## 🚀 Características

- Autenticación de usuarios con JWT
- Gestión de productos e inventario
- Sistema de carrito de compras
- Procesamiento de pedidos
- Panel de administración para gestión de usuarios
- Punto de Venta (POS) integrado
- API RESTful

## 🛠️ Tecnologías

- **Backend:** Node.js, Express
- **Base de datos:** MongoDB con Mongoose
- **Autenticación:** JWT (JSON Web Tokens)
- **Seguridad:** Bcrypt para hashing de contraseñas
- **CORS:** Soporte para peticiones de múltiples orígenes

## 📦 Instalación

1. Clona el repositorio:
   ```bash
   git clone https://github.com/Vsdestroyer0/BackendTienda.git
   cd BackTienda
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

3. Configura las variables de entorno:
   Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:
   ```
   MONGODB_URI=tu_cadena_de_conexion_mongodb
   JWT_SECRET=tu_clave_secreta_jwt
   PORT=3000
   ```

4. Inicia el servidor:
   ```bash
   npm start
   ```

   El servidor estará disponible en `http://localhost:3000`

## 🚦 Estructura del Proyecto

```
BackTienda/
├── Backend/
│   ├── models/         # Modelos de la base de datos
│   ├── routes/         # Rutas de la API
│   └── storage/        # Almacenamiento de archivos
├── node_modules/       # Dependencias
├── .env                # Variables de entorno
├── db.js              # Configuración de la base de datos
├── package.json       # Dependencias y scripts
└── server.js          # Punto de entrada de la aplicación
```

## 📚 Documentación de la API

La documentación completa de la API está disponible en [Postman](https://documenter.getpostman.com/view/...).

### Endpoints principales:

- `POST /api/auth/register` - Registrar nuevo usuario
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/products` - Obtener todos los productos
- `POST /api/orders` - Crear un nuevo pedido
- `GET /api/inventory` - Obtener inventario

## 🤝 Contribución

Las contribuciones son bienvenidas. Por favor, lee las [directrices de contribución](CONTRIBUTING.md) antes de enviar un pull request.

## 📄 Licencia

Este proyecto está bajo la Licencia ISC. Ver el archivo [LICENSE](LICENSE) para más detalles.

## ✉️ Contacto

Si tienes alguna pregunta o sugerencia, por favor abre un issue en el repositorio o contacta al equipo de desarrollo.

---

Desarrollado con ❤️ por [Tu Nombre](https://github.com/Vsdestroyer0)