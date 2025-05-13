import Link from "../models/Links.js";
import dotenv from "dotenv";

dotenv.config();

export const linkMiddleware = async (req, res, next) => {
  try {
    const { originalUrl, userCode } = req.body;
    const url = originalUrl.trim();
    const code = userCode?.trim() ?? "";

    if (!originalUrl) {
      return res.status(400).json({ error: "Enlace invalido" });
    }

    if (code) {
      const codeRegex = /^[a-zA-Z0-9_-]+$/;
      if (!codeRegex.test(code)) {
        return res.status(400).json({ error: "No es un codigo valido" });
      }
      if (code.length > 12) {
        return res
          .status(400)
          .json({ error: "Tu codigo es muy largo max 12 caracteres" });
      }
      const codeUnique = await Link.exists({ shorter: code });
      if (codeUnique) {
        return res
          .status(400)
          .json({ error: "Ya existe un enlace con este codigo personalizado" });
      }
    }
    try {
      new URL(url);
    } catch (error) {
      return res.status(400).json({ error: "No es un enlace válido" });
    }

    next();
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Error interno en el servidor" });
  }
};

export const redirectMiddleware = async (req, res, next) => {
  const code = await Link.findOne({ shorter: req.params.short });

  if (!code) {
    return res.status(400).json({ error: "No es un enlace valido" });
  }

  next();
};
