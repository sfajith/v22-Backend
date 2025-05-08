import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

export const dbConnect = async () => {
  try {
    await mongoose.connect(
      `mongodb://${process.env.MONGO_INITDB_ROOT_USERNAME}:${process.env.MONGO_INITDB_ROOT_PASSWORD}@${process.env.MONGO_INITDB_HOST}:${process.env.MONGO_INITDB_PORT}/${process.env.MONGO_INITDB_DATABASE}`,
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        authSource: "admin",
      }
    );
    console.log("MongoDB conectado 🚀");
  } catch (error) {
    console.error("Error al conectar MOngoDB", error);
    process.exit(1);
  }
};
