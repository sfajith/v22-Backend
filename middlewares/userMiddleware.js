import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import User from "../models/User.js";
import crypto from "crypto";
import { validatePasswordStrength } from "../../shared/dist/validatePasswordStrength.js";

dotenv.config();

export const registerMiddleware = async (req, res, next) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: "datos imcompletos" });
  }

  const triUsername = username.trim().toLowerCase(),
    triEmail = email.toLowerCase(),
    triPassword = password.trim();

  const regexUsername = /^[a-z0-9._]{3,20}$/;
  if (!regexUsername.test(triUsername)) {
    return res.status(400).json({
      error:
        "El nombre de usuario debe tener entre 3 y 20 caracteres y solo puede contener letras, números, puntos o guiones bajos.",
    });
  }

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

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(triEmail);

  if (!isValidEmail(triEmail) || triEmail.length > 254) {
    return res.status(400).json({
      error: "Debes introducir un correo válido (máximo 254 caracteres).",
    });
  }

  if (triPassword.length < 6 || triPassword.length > 64) {
    return res
      .status(400)
      .json({ error: "La contraseña debe tener entre 6 y 64 caracteres." });
  }

  const isStrength = validatePasswordStrength(password);

  if (isStrength.strength === "Débil") {
    return res.status(400).json({ error: "Esta es una contraseña débil" });
  }

  return next();
};

export const loginMiddleware = (req, res, next) => {
  const { username, email, password } = req.body;

  const credential = username || email;

  if (!credential || !password) {
    return res.status(400).json({ error: "Datos incompletos" });
  }

  return next();
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
    return next();
  } catch (error) {
    console.log(error);

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expirado" });
    }

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

    return next();
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
  return next();
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
    return next();
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

    return next();
  } catch (error) {
    return res.status(500).json({ error: "Error interno del servidor" });
  }
};

export const usernameValidationMiddleware = async (req, res, next) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: "No existe username" });
    }

    const trimmedUsername = username.trim().toLowerCase();
    const regexUsername = /^[a-z0-9._]{3,20}$/;
    if (!regexUsername.test(trimmedUsername)) {
      return res.status(400).json({
        error:
          "El nombre de usuario debe tener entre 3 y 20 caracteres y solo puede contener letras, números, puntos o guiones bajos.",
      });
    }
    const user = await User.findOne({ username: trimmedUsername });
    req.user = user;
    return next();
  } catch (error) {
    return res.status(500).json({ error: "Error interno del servidor" });
  }
};

export const emailValidationMiddleware = async (req, res, next) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "No existe email" });
  }

  const trimmedEmail = email.trim().toLowerCase();
  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (!isValidEmail(trimmedEmail) || trimmedEmail.length > 254) {
    return res.status(400).json({
      error: "Debes introducir un correo válido (máximo 254 caracteres).",
    });
  }
  const userEmail = await User.findOne({ email: trimmedEmail });
  req.userEmail = userEmail;
  return next();
};

export const passwordValidationMiddleware = (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res
        .status(400)
        .json({ error: "debes introducir una contraseña correcta" });
    }

    const isStrength = validatePasswordStrength(password);

    if (isStrength.strength === "Débil") {
      return res.status(400).json({ error: "Esta es una contraseña débil" });
    }

    next();
  } catch (error) {
    return res.status(500).json({ error: "Error interno en el servidor" });
  }
};
