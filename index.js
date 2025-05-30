import compresion from "compresion";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import express from "express";
import swagger from "swagger-ui-express";
import YAML from "yamljs";
import userRoutes from "./routes/userRoutes.js";
import linkRoutes from "./routes/linkRoutes.js";
import authRoutes from "./auth/authRoutes.js";
import cors from "cors";
import cron from "node-cron";
import { cleanOldLinks } from "./cron/cleanOldLinks.js";

import { dbConnect } from "./db/mongo.js";

const cfg = {
  port: process.env.PORT || 3000,
};

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error:
        "Has superado el límite de peticiones. Intenta nuevamente en unos minutos.",
    });
  },
});

const app = express();
const swaggerDocument = YAML.load("./openapi.yaml");

dbConnect();

app.use(cors());
app.use(helmet());

app.use(compresion());

app.use(limiter);

app.disable("x-powered-by");

app.use(express.urlencoded({ extended: true }));
// Middleware para procesar JSON
app.use(express.json());

app.use("/", linkRoutes);
app.use("/auth", authRoutes);
app.use("/api/user", userRoutes);

app.use("/doc/link", swagger.serve, swagger.setup(swaggerDocument));

cron.schedule("0 2 * * *", async () => {
  console.log("⏰ Ejecutando limpieza de enlaces...");
  await cleanOldLinks();
});

app.listen(cfg.port, () => {
  console.log(`Server corriendo en el puerto ${cfg.port}`);
});
