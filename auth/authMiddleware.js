import dotenv from "dotenv";
import User from "../models/User.js";
import crypto from "crypto";
import { validatePasswordStrength } from "../../shared/dist/validatePasswordStrength.js";
import { areYouHuman } from "../utils/areYouHuman.js";

dotenv.config();

export const registerMiddleware = async (req, res, next) => {
  const { username, email, password, gToken } = req.body;

  if (!gToken) {
    return res.status(400).json({ error: "Token de reCAPTCHA es requerido" });
  }

  const human = await areYouHuman(gToken);

  if (!human) {
    return res.status(403).json({
      error:
        "No pudimos verificar que seas humano. Por favor, intenta nuevamente.",
    });
  }

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

export const loginMiddleware = async (req, res, next) => {
  try {
    const { username, email, password, gToken } = req.body;
    const credential = username || email;

    if (!gToken) {
      return res.status(400).json({ error: "Token de reCAPTCHA es requerido" });
    }

    const human = await areYouHuman(gToken);

    if (!human) {
      return res.status(403).json({
        error:
          "No pudimos verificar que seas humano. Por favor, intenta nuevamente.",
      });
    }

    if (!credential || !password) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

    return next();
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "error interno en el servidor" });
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
    const { email, gToken } = req.body;
    const trimmedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: trimmedEmail });

    if (!gToken) {
      return res.status(400).json({ error: "Token de reCAPTCHA es requerido" });
    }

    const human = await areYouHuman(gToken);

    if (!human) {
      return res.status(403).json({
        error:
          "No pudimos verificar que seas humano. Por favor, intenta nuevamente.",
      });
    }

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
