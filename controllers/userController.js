import bcrypt from "bcrypt";
import User from "../models/User.js";
import Link from "../models/Links.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import mongoose from "mongoose";
import crypto from "crypto";
import sendConfirmationEmail from "../utils/sendEmail.js";
import forgotPasswordEmail from "../utils/forgotPasswordEmail.js";
import { checkPwnedPassword } from "../utils/checkPwnedPassword.js";

dotenv.config();

export const registerController = async (req, res) => {
  try {
    //token para verificar la cuenta
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    const saltRounds = 10;
    const { username, email, password } = req.body;

    const trimedUsername = username.trim(),
      trimedEmail = email.toLowerCase();

    const hashPassword = async (plainPassword) => {
      const salt = await bcrypt.genSalt(saltRounds); // Genera un "salt"
      const hashedPassword = await bcrypt.hash(plainPassword, salt); // Hashea la contraseña
      return hashedPassword;
    };

    const securePassword = await hashPassword(password);

    const newUser = new User({
      username: trimedUsername,
      email: trimedEmail,
      password: securePassword,
      emailVerificationToken: hashedToken,
      emailVerificationExpires: Date.now() + 1000 * 60 * 60,
    });

    await newUser.save();
    await sendConfirmationEmail(email, username, rawToken);
    res.status(200).json({ success: "Nuevo usuario registrado" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Error interno en el servior" });
  }
};

export const loginController = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!password || (!email && !username)) {
      return res.status(400).json({ error: "datos incompletos" });
    }

    if (username || email) {
      const user = await User.findOne({
        $or: [
          { username: username?.trim() },
          { email: email?.trim().toLowerCase() },
        ],
      });
      if (!user)
        return res.status(404).json({ error: "Usuario no encontrado" });

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res
          .status(401)
          .json({ error: "Usuario y/o contraseña incorrectos" });
      }
      const token = jwt.sign(
        {
          id: user._id,
          username: user.username,
          tokenVersion: user.tokenVersion,
        },
        process.env.JWT_SECRET,
        {
          expiresIn: process.env.JWT_EXPIRES,
        }
      );

      return res.status(200).json({
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          statistics: user.statistics,
          LinkActivity: user.LinkActivity,
          clickAnalitycs: user.clickAnalitycs,
        },
      });
    }
  } catch (error) {
    res.status(500).json({ error: "Error interno en el servidor" });
  }
};

export const myAccountController = async (req, res) => {
  res.json({
    userData: {
      id: req.user._id,
      username: req.user.username,
      email: req.user.email,
    },
  });
};

export const myCollectionController = async (req, res) => {
  try {
    const { username } = req.params;
    const { cursor, limit = 6 } = req.query;
    const user = await User.findOne({ username }).lean();
    if (!user || !user.shortLinks || user.shortLinks.length === 0) {
      return res.status(200).json({
        totalCount: 0,
        collection: [],
        nextCursor: null,
      });
    }
    const shortLinks = user.shortLinks;

    const query = { _id: { $in: shortLinks } };

    if (cursor) {
      query.createdAt = { $lt: new Date(cursor) };
    }
    const links = await Link.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    const totalCount = user.shortLinks.length;

    const nextCursor =
      links.length > 0 ? links[links.length - 1].createdAt : null;

    const collection = links.map((link) => ({
      idLink: link._id,
      originalUrl: link.originalUrl,
      shorter: `http://localhost:3000/${link.shorter}`,
      clicks: link.clicks,
      visitors: link.visitors.length,
      clickHistory: link.clickHistory,
      date: link.createdAt,
    }));

    res.status(200).json({
      totalCount,
      collection,
      nextCursor,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error interno en el servidor" });
  }
};

export const deleteController = async (req, res) => {
  try {
    const user = req.user;
    const { password } = req.body;

    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Contraseña incorrecta" });
    }

    const ids = [...user.shortLinks];

    const [deleteUser, deleteLinks] = await Promise.all([
      User.findByIdAndDelete(user._id),
      ids.length > 0
        ? Link.deleteMany({ _id: { $in: ids } })
        : Promise.resolve(),
    ]);

    if (!deleteUser) {
      return res
        .status(404)
        .json({ error: "No se encontro ningun usuario para eliminar" });
    }

    return res.status(200).json({ success: "Usuario eliminado con exito" });
  } catch (error) {
    return res.status(500).json({ error: "Error interno en el servidor" });
  }
};

export const resetPasswordController = async (req, res) => {
  try {
    const { password, newPassword } = req.body;
    const user = req.user;
    const saltRounds = 10;

    const verifyUser = await User.exists({ _id: user.id });

    if (!password || !newPassword || !verifyUser) {
      return res.status(400).json({ error: "Error en la solicitud" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ error: "La nueva contraseña es muy corta" });
    }

    if (newPassword === password) {
      return res
        .status(400)
        .json({ error: "Ya usaste esta contraseña en el pasado" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Contraseña incorrecta" });
    }

    const hashPassword = async (plainPassword) => {
      const salt = await bcrypt.genSalt(saltRounds); // Genera un "salt"
      const hashedPassword = await bcrypt.hash(plainPassword, salt); // Hashea la contraseña
      return hashedPassword;
    };

    const oldPassword = user.password;
    const olderPasswords = user.olderPasswords || [];
    const newOlderPasswords = [
      ...olderPasswords,
      { older: oldPassword, changedAt: new Date() },
    ];

    if (newOlderPasswords.length > 24) {
      newOlderPasswords.shift();
    }

    for (const item of olderPasswords) {
      const isSame = await bcrypt.compare(newPassword, item.older);
      if (isSame) {
        return res.status(400).json({
          error:
            "Ya has usado esta contraseña recientemente. Por favor, elige una diferente.",
        });
      }
    }
    const newSecurePassword = await hashPassword(newPassword);

    await User.findByIdAndUpdate(
      user.id,
      {
        $set: {
          password: newSecurePassword,
          olderPasswords: newOlderPasswords,
        },
        $inc: { tokenVersion: 1 },
      },
      { new: true }
    );
    return res
      .status(200)
      .json({ success: "Contraseña actualizada con exito" });
  } catch (error) {
    return res.status(500).json({ error: "Error interno del servidor" });
  }
};

export const logoutController = async (req, res) => {
  try {
    const user = req.user;

    await User.findByIdAndUpdate(user.id, {
      $inc: { tokenVersion: 1 },
    });

    res.status(200).json({ success: "El usuario ha cerrado sesion" });
  } catch (error) {
    res.status(500).json({ error: "error interno en el servidor" });
  }
};

export const deleteLinkController = async (req, res) => {
  let session;
  try {
    const user = req.user;
    const { linkId, username } = req.params;

    if (!linkId || !username) {
      return res.status(400).json({ error: "Error en la solicitud" });
    }

    if (user.username !== username) {
      return res.status(403).json({ error: "No estas autorizado para esto" });
    }

    const existsLink = await Link.exists({ _id: linkId });

    if (!existsLink) {
      return res.status(404).json({ error: "No existe el enlace" });
    }

    const ownLink = await User.exists({ _id: user.id, shortLinks: linkId });

    if (!ownLink) {
      return res.status(403).json({ error: "No estas autorizado para esto" });
    }

    session = await mongoose.startSession();
    session.startTransaction();

    try {
      await Link.findByIdAndDelete({ _id: linkId }).session(session);
      await User.findByIdAndUpdate(
        user.id,
        { $pull: { shortLinks: linkId } },
        { new: true }
      ).session(session);

      await session.commitTransaction();
      session.endSession();
      return res.status(200).json({ success: "Enlace eliminado con exito" });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error) {
    return res.status(500).json({ error: "error interno del servidor" });
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};

export const authController = async (req, res) => {
  try {
    const user = req.user;
    return res.status(200).json({
      ok: true,
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
    return res.status(500).json({ error: "error interno del servidor" });
  }
};

export const verifyAccountController = async (req, res) => {
  try {
    res.status(200).json({ success: "Cuenta verificada con exito!" });
  } catch (error) {
    return res.status(500).json({ error: "error interno del servidor" });
  }
};

export const resendVerifyController = async (req, res) => {
  const user = req.user;

  try {
    //token para verificar la cuenta
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpires = Date.now() + 1000 * 60 * 60; // 1 hora
    await user.save();

    await sendConfirmationEmail(user.email, user.username, rawToken);

    return res
      .status(200)
      .json({ success: "El enlace de verificación fué enviado de nuevo" });
  } catch (error) {
    return res.status(500).json({ error: "error interno del servidor" });
  }
};

export const forgotPasswordController = async (req, res) => {
  const user = req.user;
  try {
    const forgotToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(forgotToken)
      .digest("hex");

    user.forgotPasswordToken = hashedToken;
    user.forgotPasswordExpires = Date.now() + 1000 * 60 * 15;
    await user.save();

    await forgotPasswordEmail(user.email, forgotToken);
    return res
      .status(200)
      .json({ success: "Enlace de restablecimiento enviado" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "error interno del servidor" });
  }
};

export const recoverPasswordController = async (req, res) => {
  try {
    const user = req.user;
    const trimmedPassword = req.trimmedPassword;
    const saltRounds = 10;
    const hashPassword = async (plainPassword) => {
      const salt = await bcrypt.genSalt(saltRounds); // Genera un "salt"
      const hashedPassword = await bcrypt.hash(plainPassword, salt); // Hashea la contraseña
      return hashedPassword;
    };
    const securePassword = await hashPassword(trimmedPassword);

    user.forgotPasswordToken = null;
    user.forgotPasswordExpires = null;
    user.password = securePassword;

    await user.save();

    return res
      .status(200)
      .json({ success: "Contraseña reestablecida con exito." });
  } catch (error) {
    return res.status(500).json({ error: "error interno del servidor" });
  }
};

export const usernameValidationController = async (req, res) => {
  try {
    if (req.user) {
      return res
        .status(409)
        .json({ error: "Nombre de usuario ya está en uso" });
    }
    return res.status(200).json({ success: "Disponible!" });
  } catch (error) {
    return res.status(500).json({ error: "error interno del servidor" });
  }
};

export const emailValidationController = async (req, res) => {
  try {
    if (req.userEmail) {
      return res
        .status(409)
        .json({ error: "Ya existe una cuenta registrada con este correo" });
    }
    return res.status(200).json({ success: "Disponible!" });
  } catch (error) {
    return res.status(500).json({ error: "error interno del servidor" });
  }
};

export const passwordValidationControlador = async (req, res) => {
  try {
    const { password } = req.body;
    const isGood = await checkPwnedPassword(password);
    if (!isGood)
      return res
        .status(400)
        .json({ error: "la contraseña se encuentra en Pwned" });

    return res.status(200).json({ success: "la contraseña es segura" });
  } catch (error) {
    return res.status(500).json({ error: "Error interno en el servidor" });
  }
};
