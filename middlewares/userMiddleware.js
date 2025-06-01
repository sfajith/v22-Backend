import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { validatePasswordStrength } from "../../shared/dist/validatePasswordStrength.js";

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
    console.log(token, "accesstokend esde retry");

    if (!token) {
      return res.status(401).json({ error: "No tienes permiso para esto" });
    }

    //verificando token
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const user = await User.findById(decoded.id);
    //console.log(user.failLogin.blockedUntil);
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
    // console.log(error);
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expirado" });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Token inválido o mal formado" });
    }

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
