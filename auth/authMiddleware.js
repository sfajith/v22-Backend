import dotenv from "dotenv";
import User from "../models/User.js";
import crypto from "crypto";
import { validatePasswordStrength } from "../../shared/dist/validatePasswordStrength.js";
import { areYouHuman } from "../utils/areYouHuman.js";
import jwt from "jsonwebtoken";
import redisClient from "./redis.js";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/tokenGenerator.js";

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

export const renewMiddleware = async (req, res) => {
  console.log("entra renewMiddleware");
  try {
    const refreshToken = req.cookies.refreshToken;
    console.log(refreshToken, "refreshToken que recibo en renew");
    if (!refreshToken)
      return res
        .status(401)
        .json({ error: "No existe el token sesion invalida" });

    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const userId = payload.id;

    const existOnRedis = await redisClient.get(`refreshToken:${userId}`);

    if (!existOnRedis) return res.status(401).json({ error: "Token invalido" });
    const isBlackListed = await redisClient.exists(`blacklist:${refreshToken}`);
    if (isBlackListed) return res.status(401).json({ error: "Token inválido" });

    const user = await User.findById(userId).lean();

    if (!user) return res.status(404).json({ error: "Usuario invalido" });

    const accessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    await redisClient.set(
      `refreshToken:${user.id}`,
      newRefreshToken,
      "EX",
      60 * 60 * 24 * 7
    );
    console.log(
      `Voy a enviar nuevo refreshToken en Set-Cookie ${newRefreshToken}`
    );
    return res
      .status(200)
      .cookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        sameSite: "lax", // para localhost en HTTP
        secure: false, // debe ser false si no usas HTTPS
        path: "/",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .json({
        accessToken,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          statistics: user.statistics,
          LinkActivity: user.LinkActivity,
          clickAnalitycs: user.clickAnalitycs,
        },
      });
  } catch (error) {
    console.log(error);
    return res.status(403).json({ error: "Error al generar nuevo token" });
  }
};

export const logoutMiddleware = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) return res.status(401).json({ error: "Token inválido" });

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    const userId = decoded.id;

    const existOnRedis = await redisClient.get(`refreshToken:${userId}`);

    if (!existOnRedis) return res.status(401).json({ error: "Token invalido" });

    const exp = decoded.exp;
    const now = Math.floor(Date.now() / 1000);
    const ttl = exp - now;

    if (ttl > 0) {
      await redisClient.set(`blacklist:${refreshToken}`, "1", "EX", ttl);
    }
    await redisClient.del(`refreshToken:${userId}`);

    return res
      .clearCookie("refreshToken", { path: "/" })
      .status(200)
      .json({ success: "Sesión cerrada correctamente" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Error cerrando sesión" });
  }
};
