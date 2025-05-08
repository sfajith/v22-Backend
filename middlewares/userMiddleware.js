import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import User from "../models/User.js";

dotenv.config();

export const registerMiddleware = (req, res, next) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: "datos imcompletos" });
  }

  const triUsername = username.trim(),
    triEmail = email.toLowerCase(),
    triPassword = password.trim();

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (triUsername.length < 4) {
    return res.status(400).json({ error: "El username es muy corto" });
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
      return res.status(401).json({ error: "Token invalido" });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: "Token invalido" });
  }
};
