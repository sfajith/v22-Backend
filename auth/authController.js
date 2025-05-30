import bcrypt from "bcrypt";
import User from "../models/User.js";
import Link from "../models/Links.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import crypto from "crypto";
import sendConfirmationEmail from "../utils/sendEmail.js";
import forgotPasswordEmail from "../utils/forgotPasswordEmail.js";
import passwordWasChanged from "../utils/passwordWasChanged.js";
import redisClient from "./redis.js";

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

      if (user.failLogin.blockedUntil) {
        const blockedUntilDate = new Date(user.failLogin.blockedUntil);
        const now = new Date();

        if (blockedUntilDate > now) {
          return res.status(403).json({
            error: `Por seguridad, tu cuenta ha sido bloqueada hasta las ${blockedUntilDate.toTimeString().slice(0, 8)}.
Puedes restablecer tu contraseña si deseas acceder antes.`,
          });
        }

        if (blockedUntilDate <= now) {
          await User.updateOne(
            { email },
            {
              $set: {
                "failLogin.count": 0,
                "failLogin.blockedUntil": null,
              },
            }
          );
        }
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        const newCount = user.failLogin.count + 1;
        const now = new Date();
        const blockedUntilDate = new Date(now.getTime() + 15 * 60 * 1000);

        await User.updateOne(
          { email },
          {
            $set: {
              "failLogin.lastAttempt": now,
              ...(newCount === 5 && {
                "failLogin.blockedUntil": blockedUntilDate,
              }),
            },
            $inc: {
              "failLogin.count": 1,
            },
          }
        );
        return res
          .status(401)
          .json({ error: "Usuario y/o contraseña incorrectos" });
      }

      if (!user.isVerified) {
        return res.status(401).json({
          error:
            "Tu cuenta aún no ha sido verificada. Por favor revisa tu correo o solicita un nuevo enlace.",
        });
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

      await redisClient.set(`token:${user.id}`, token, "EX", 60 * 60 * 24 * 7);
      const redisToken = await redisClient.get(`token:${user.id}`);
      console.log(redisToken);

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
    console.log(error);
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

    await passwordWasChanged(user.email, user.username);
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
      const isSame = await bcrypt.compare(trimmedPassword, item.older);
      if (isSame) {
        return res.status(400).json({
          error:
            "Ya has usado esta contraseña recientemente. Por favor, elige una diferente.",
        });
      }
    }
    const securePassword = await hashPassword(trimmedPassword);

    user.forgotPasswordToken = null;
    user.forgotPasswordExpires = null;
    user.password = securePassword;
    user.failLogin.count = 0;
    user.failLogin.blockedUntil = null;

    await user.save();
    await passwordWasChanged(user.email, user.username);
    return res
      .status(200)
      .json({ success: "Contraseña reestablecida con exito." });
  } catch (error) {
    return res.status(500).json({ error: "error interno del servidor" });
  }
};
