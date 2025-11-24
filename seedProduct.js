import mongoose from "mongoose";
import dotenv from "dotenv";
import connectDB from "./db.js";
import Product from "./Backend/models/product/Product.js";

dotenv.config();

const seedMany = async () => {
    console.log("Conectando a la base de datos...");
    await connectDB();

    try {
        console.log("Generando 20 productos de prueba...");

        const products = [];

        for (let i = 1; i <= 20; i++) {
            // Generamos un SKU único para evitar errores de duplicado
            const uniqueSuffix = Math.random().toString(36).substring(7).toUpperCase();

            products.push({
                name: `Producto de Prueba ${i}`,
                brand: i % 2 === 0 ? "Nike" : "Adidas", // Alternar marcas
                price: 1000 + (i * 50), // Precios variados
                salePrice: i % 3 === 0 ? 900 + (i * 50) : undefined, // Algunos con oferta
                category: i % 2 === 0 ? "Hombres" : "Mujeres",
                description: `Descripción genérica para el producto ${i}. Ideal para pruebas.`,
                reviews: {
                    averageRating: (Math.random() * 2 + 3).toFixed(1), // Rating entre 3.0 y 5.0
                    reviewCount: Math.floor(Math.random() * 100),
                },
                variants: [
                    {
                        colorName: "Estándar",
                        sku: `TEST-PROD-${i}-${uniqueSuffix}`, // SKU ÚNICO
                        images: ["/placeholder-shoe.jpg"], // Usamos el placeholder que ya tienes
                        sizes: [
                            { size: "26 MX", stock: 10 },
                            { size: "27 MX", stock: 5 },
                            { size: "28 MX", stock: 0 }, // Agotado
                        ],
                    },
                ],
                details: [
                    { title: "Material", content: "Sintético" },
                    { title: "Origen", content: "Importado" },
                ],
            });
        }

        // Insertar todos de una vez
        await Product.insertMany(products);
        console.log("¡20 productos creados exitosamente!");

    } catch (error) {
        console.error("Error al sembrar datos:", error);
    } finally {
        await mongoose.connection.close();
        console.log("Desconectado.");
    }
};

seedMany();