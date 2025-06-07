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
          .json({ error: "Tu codigo es muy largo. max 12 caracteres" });
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

    return next();
  } catch (error) {
    console.log(error, "desde middleware");
    return res.status(500).json({ error: "Error interno en el servidor" });
  }
};

export const redirectMiddleware = async (req, res, next) => {
  const code = await Link.findOne({ shorter: req.params.short });

  if (!code) {
    return res.status(400).json({ error: "No es un enlace valido" });
  }

  return next();
};

export const liveCodeMiddleware = async (req, res, next) => {
  try {
    const { userCode } = req.body;
    const code = userCode?.trim() ?? "";
    if (code) {
      const codeRegex = /^[a-zA-Z0-9_-]+$/;
      if (!codeRegex.test(code)) {
        return res.status(400).json({ error: "No es un codigo valido" });
      }
      if (code.length > 12) {
        return res
          .status(400)
          .json({ error: "Tu codigo es muy largo. max 12 caracteres" });
      }
      const codeUnique = await Link.exists({ shorter: code });
      if (codeUnique) {
        return res.status(400).json({ error: "No Disponible!" });
      }
    }
    return next();
  } catch (error) {
    return res.status(500).json({ error: "Error interno en el servidor" });
  }
};

export const secureLinkCheckerMiddleware = async (req, res) => {
  const { url } = req.body;

  const body = {
    client: { clientId: "v22", clientVersion: "1.0" },
    threatInfo: {
      threatTypes: ["MALWARE", "SOCIAL_ENGINEERING"],
      platformTypes: ["ANY_PLATFORM"],
      threatEntryTypes: ["URL"],
      threatEntries: [{ url }],
    },
  };

  fetch(
    `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${process.env.SECURE_BROWSER_API}`,
    {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    }
  )
    .then((response) => response.json())
    .then((data) => {
      console.log(data);
      if (data.matches && data.matches.length > 0) {
        res.status(403).json({ error: "Url maliciosa detectada" });
      } else {
        res.status(200).json({ success: "Url segura" });
      }
    })
    .catch((error) => {
      console.error("Error al validar el enlace:", error);
      res.status(500).json({ error: "Error en la verificación de seguridad" });
    });
};
