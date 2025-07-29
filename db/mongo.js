import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

export const dbConnect = async () => {
  try {
    // Usa directamente MONGO_URI si está definida
    const uri = process.env.MONGO_URI 
      || `mongodb://${process.env.MONGO_INITDB_ROOT_USERNAME}:${process.env.MONGO_INITDB_ROOT_PASSWORD}@${process.env.MONGO_INITDB_HOST}:${process.env.MONGO_INITDB_PORT}/${process.env.MONGO_INITDB_DATABASE}?authSource=admin`;

    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("MongoDB conectado 🚀");
  } catch (error) {
    console.error("Error al conectar MongoDB:", error);
    process.exit(1);
  }
};
