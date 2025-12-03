// Inicializar servidor e importar paquetes fuera del proyecto
import express from "express";
import cors from "cors";
import connectDB from "./db.js";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import dotenv from "dotenv";
// Importar rutas del proyecto
import authRoutes from "./Backend/routes/users/authRoutes.js";
import orderRoutes from "./Backend/routes/orders/orderRoutes.js";
import inventoryRoutes from "./Backend/routes/inventory/inventoryRoutes.js";
import productsRoutes from "./Backend/routes/products/productsRoutes.js";
import cartRoutes from "./Backend/routes/cart/cartRoutes.js";
import adminUsersRoutes from "./Backend/routes/admin/adminUsersRoutes.js";
import posRoutes from "./Backend/routes/pos/posRoutes.js";
import favoritesRoutes from "./Backend/routes/favorites/favoritesRoutes.js";
import userRoutes from "./Backend/routes/users/userRoutes.js";

// Validar conexión a la base de datos
mongoose.connection.once("open", () => {
    console.log("[Mongo] conectado a", mongoose.connection.host, mongoose.connection.name);
});

// Configurar variables de entorno
dotenv.config();

// Iniciar el servidor
const app = express();

async function startServer() {
    await connectDB();
    // Configuración de seguridad, esta sirve para que el servidor pueda recibir peticiones de otros servidores
    // y que pueda recibir cookies, Railway requiere esta configuración
    app.set("trust proxy", 1);
    // Middleware para parsear JSON sin este no se puede recibir datos
    app.use(express.json());

    // Middleware para parsear cookies sin este no se pueden recibir cookies
    app.use(cookieParser());

    const allowList = [
        process.env.APP_URL_LOCAL,
        process.env.APP_URL_PRODUCTION,
        "https://app.netlify.com/projects/eccomerce-f5/configuration/env#VITE_GOOGLE_CLIENT_ID"
    ];

    app.use(cors({
        // Origin es la url de la app que esta haciendo la peticion
        // Callback es una funcion que se ejecuta cuando se hace la peticion
        // Lo que hacen aqui es validar si la url de la app que esta haciendo la peticion esta en la lista de permitidos
        origin: function (origin, callback) {
            if (!origin) {
                // Si no hay origin, se permite la peticion y esta es la forma de indicarle a cors que se permite la peticion
                return callback(null, true)
            }
            // Si la url de la app que esta haciendo la peticion esta en la lista de permitidos, se permite la peticion
            if (allowList.includes(origin)) {
                return callback(null, true);
            }
            // Si la url de la app que esta haciendo la peticion no esta en la lista de permitidos, se deniega la peticion
            return callback(new Error("No permitido por CORS"))
        },
        // Metodos que se permiten para la peticion
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
        // Indica que se permiten cookies
        credentials: true,
        // Indica que se permite la peticion OPTIONS 
        // Options es una peticion de prueba que se hace para validar si la peticion es correcta
        optionsSuccessStatus: 200
    }));

    // Abajo se agregan las rutas de la app que estarán en la capeta routes
    app.use("/api/auth", authRoutes);
    app.use("/api/orders", orderRoutes);
    app.use("/api/admini", inventoryRoutes);
    app.use("/api/admin", adminUsersRoutes);
    app.use("/api/pos", posRoutes);
    app.use("/api/products", productsRoutes);
    app.use("/api/cart", cartRoutes);
    app.use("/api/favorites", favoritesRoutes);
    app.use("/api/auth", authRoutes);
    app.use("/api/users", userRoutes); // <-- AGREGAR ESTO (quedará como /api/users/addresses)
    app.use("/api/orders", orderRoutes);

    // Healt check para Railway o render
    // Healt check es un endpoint que retorna un json con un objeto que tiene la propiedad ok con el valor true
    // y la propiedad ok y true significan que la app esta funcionando correctamente
    app.get("/api/health", (req, res) => {
        res.json({ ok: true });
    });

    // Iniciar ahora si el server
    // PORT es la variable de entorno que indica el puerto en el que se va a iniciar el servidor
    // process.env.PORT es la variable de entorno que indica el puerto en el que se va a iniciar el servidor
    const PORT = process.env.PORT || 3000;
    // HOST es la variable de entorno que indica el host en el que se va a iniciar el servidor
    // Se inicia en 0.0.0.0 para que pueda recibir peticiones de cualquier host
    const HOST = "0.0.0.0";

    // Iniciar el servidor :D
    app.listen(PORT, HOST, () => {
        console.log(`Servidor iniciado en http://${HOST}:${PORT}`);
    });
}
// Ps pa que crees que es
startServer();



