import mongoose from "mongoose";
import dotenv from "dotenv";
import connectDB from "./db.js"; // Ajusta la ruta a tu 'db.js'
import Product from "./Backend/models/product/Product.js"; // ¡Ajusta la ruta a tu modelo Product!

dotenv.config();

// 1. LOS DATOS DE PRUEBA
// Esta es la estructura exacta que espera tu frontend y tu backend
const testProductData = {
    name: "Botas de Montaña Impermeables",
    brand: "AventuraPro",
    price: 2899.0,
    salePrice: 2499.0,
    category: "Calzado",
    description:
        "Conquista cualquier sendero con las botas AventuraPro. Diseñadas para la máxima durabilidad y confort, cuentan con tecnología impermeable y una suela de agarre superior para terrenos difíciles.",
    reviews: {
        averageRating: 4.8,
        reviewCount: 132,
    },
    variants: [
        {
            colorName: "Marrón Coyote",
            colorHex: "#8D6E63",
            sku: "AP-BOTA-COY-01", // Usaremos este SKU para verificar si ya existe
            images: [
                "https://via.placeholder.com/600x600/8D6E63/FFFFFF.png?text=Bota+Marrón+1",
                "https://via.placeholder.com/600x600/8D6E63/FFFFFF.png?text=Bota+Marrón+2",
                "https://via.placeholder.com/600x600/8D6E63/FFFFFF.png?text=Bota+Marrón+3",
                "https://via.placeholder.com/600x600/8D6E63/FFFFFF.png?text=Bota+Marrón+4",
            ],
            sizes: [
                { size: "26 MX", stock: 5 },
                { size: "27 MX", stock: 2 },
                { size: "28 MX", stock: 0 },
                { size: "29 MX", stock: 8 },
            ],
        },
        {
            colorName: "Negro Táctico",
            colorHex: "#212121",
            sku: "AP-BOTA-BLK-01",
            images: [
                "https://via.placeholder.com/600x600/212121/FFFFFF.png?text=Bota+Negra+1",
                "https://via.placeholder.com/600x600/212121/FFFFFF.png?text=Bota+Negra+2",
            ],
            sizes: [
                { size: "26 MX", stock: 3 },
                { size: "27 MX", stock: 10 },
                { size: "28 MX", stock: 12 },
            ],
        },
    ],
    details: [
        { title: "Material Superior", content: "Piel sintética y malla" },
        { title: "Suela", content: "Goma de alta tracción" },
        { title: "Tecnología", content: "Impermeable (Waterproof)" },
        { title: "Tipo de cierre", content: "Agujetas" },
    ],
};

// 2. LA LÓGICA DEL SCRIPT
const seedProduct = async () => {
    console.log("Conectando a la base de datos...");
    await connectDB();

    try {
        // 2a. Revisar si el producto ya existe (usando el SKU)
        // Buscamos dentro del arreglo 'variants'
        const mainProductSKU = "AP-BOTA-COY-01";
        const existingProduct = await Product.findOne({
            "variants.sku": mainProductSKU,
        });

        if (existingProduct) {
            console.log("El producto de prueba ya existe.");
            console.log("ID del producto existente:", existingProduct._id);
            return;
        }

        // 2b. Si no existe, crear el nuevo producto
        console.log("Creando producto de prueba...");
        const product = new Product(testProductData);
        await product.save();

        console.log("¡Producto de prueba creado con éxito!");
        console.log("--- ¡GUARDA ESTE ID! ---");
        console.log("ID del nuevo producto:", product._id);
        console.log("------------------------");

    } catch (error) {
        console.error("Error al crear el producto de prueba:", error.message);
    } finally {
        // 2c. Desconectar
        await mongoose.connection.close();
        console.log("Desconectado de la base de datos.");
    }
};

// 3. EJECUTAR EL SCRIPT
seedProduct();