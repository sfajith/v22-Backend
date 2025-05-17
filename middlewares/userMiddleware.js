import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import User from "../models/User.js";
import crypto from "crypto";

dotenv.config();

export const registerMiddleware = async (req, res, next) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: "datos imcompletos" });
  }

  const triUsername = username.trim(),
    triEmail = email.toLowerCase(),
    triPassword = password.trim();

  const [user, userEmail] = await Promise.all([
    User.findOne({ username: triUsername }),
    User.findOne({ email: triEmail }),
  ]);

  if (user) {
    return res
      .status(400)
      .json({ error: "Ya existe un usuario con ese nombre" });
  }

  if (userEmail) {
    return res
      .status(400)
      .json({ error: "Ya existe una cuenta asociada a ese correo" });
  }

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (triUsername.length < 4) {
    return res.status(400).json({ error: "El username es muy corto" });
  }
  if (triUsername.length > 30) {
    return res.status(400).json({ error: "El username es muy largo" });
  }

  if (!isValidEmail(triEmail)) {
    return res.status(400).json({ error: "Debes introducir un correo valido" });
  }

  if (triPassword.length < 4) {
    return res.status(400).json({ error: "La contraseña es muy corta" });
  }

  next();
};

export const loginMiddleware = (req, res, next) => {
  const { username, email, password } = req.body;

  const credential = username || email;

  if (!credential || !password) {
    return res.status(400).json({ error: "Datos incompletos" });
  }

  next();
};

export const myAccountMiddleware = async (req, res, next) => {
  const { username } = req.params;
  try {
    const authHeader = req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "No tienes permiso para esto (token ausente o mal formado)",
      });
    }

    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ error: "No tienes permiso para esto" });
    }

    //verificando token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    /* if (user.username !== username) {
      return res.status(403).json({ error: "No tienes permiso para esto" });
    } */
    if (user.tokenVersion !== decoded.tokenVersion) {
      return res.status(401).json({ error: "Token invalido o expirado" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
};

export const verifyAccountMiddleware = async (req, res, next) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: "Token faltante" });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() },
      isVerified: false,
    });

    if (!user) {
      return res.status(400).json({ error: "Token inválido o expirado" });
    }

    user.isVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await user.save();

    next();
  } catch (error) {
    console.error("Error en verificación:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
};

export const resendVerifyMiddleware = async (req, res, next) => {
  const { email } = req.body;
  const trimmedEmail = email.trim().toLowerCase();
  console.log(trimmedEmail);
  const user = await User.findOne({ email: trimmedEmail });

  if (!user || user.isVerified) {
    return res
      .status(400)
      .json({ error: "Usuario ya está verificado o no existe." });
  }
  req.user = user;
  next();
};

export const forgotPasswordMiddleware = async (req, res, next) => {
  try {
    const { email } = req.body;
    const trimmedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: trimmedEmail });

    if (!user) {
      return res
        .status(404)
        .json({ error: "No existe una cuenta asociada a ese correo" });
    }
    req.user = user;
    next();
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Error interno en el servidor" });
  }
};

export const recoverPasswordMiddleware = async (req, res, next) => {
  try {
    const { password } = req.body;
    const { token } = req.query;
    const trimmedPassword = password.trim();

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    if (!password || trimmedPassword.length < 5) {
      return res
        .status(400)
        .json({ error: "Faltó la contraseña o es muy corta" });
    }
    if (!token) {
      return res.status(400).json({ error: "Falta el token" });
    }

    const user = await User.findOne({
      forgotPasswordToken: hashedToken,
      forgotPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        error: "Este enlace ya expiró o es invalido, solicita un nuevo enlace",
      });
    }
    req.user = user;
    req.trimmedPassword = trimmedPassword;

    next();
  } catch (error) {
    return res.status(500).json({ error: "Error interno del servidor" });
  }
};
