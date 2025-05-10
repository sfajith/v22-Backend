import { v4 as uuidv4 } from "uuid";
import Link from "../models/Links.js";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import {
  updateUserStatistics,
  updateUserLinkHistory,
} from "../utils/statisticsUpdater.js";

export const createShortLink = async (req, res) => {
  let session;
  const shorter = req.body.userCode || uuidv4().substring(0, 6);
  const token = req.header("Authorization")?.replace("Bearer ", "");
  try {
    const { originalUrl } = req.body;
    let user = null;

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        user = await User.findById(decoded.id);
      } catch (error) {
        return res.status(401).json({ error: "Unauthorized" });
      }
    }

    const newLink = new Link({
      originalUrl: originalUrl.trim(),
      shorter,
      user: user?.id || "681d063debfbeacb5cea4668",
    });

    session = await mongoose.startSession();
    session.startTransaction();
    try {
      await newLink.save({ session }),
        await User.findByIdAndUpdate(
          user?.id || "681d063debfbeacb5cea4668",
          { $push: { shortLinks: newLink._id } },
          { new: true }
        ).session(session);
      await session.commitTransaction();
      session.endSession();
      const enlace = await Link.findOne({ shorter });
      const idLink = enlace._id;
      const date = enlace.createdAt;
      const clickHistory = enlace.clickHistory;

      if (user.id) {
        await updateUserLinkHistory(user.id, idLink);
      } else {
        await updateUserLinkHistory("681d063debfbeacb5cea4668", idLink);
      }

      return res.status(200).json({
        idLink,
        originalUrl,
        shorter: `http://localhost:3000/${shorter}`,
        clickHistory,
        clicks: 0,
        visitors: 0,
        date,
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error) {
    return res.status(500).json({ error: "Error interno en el servidor" });
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};

export const linkRedirect = async (req, res) => {
  try {
    const userIp =
      req.header("X-Forwarded-For") || req.connection.remoteAddress;

    const enlace = await Link.findOneAndUpdate(
      { shorter: req.params.short },
      {
        $inc: { clicks: 1 },
        $addToSet: { visitors: userIp },
        $push: { clickHistory: { ip: userIp, date: new Date() } },
      },
      { new: true }
    );

    if (!enlace) {
      return res.status(404).json({ error: "Enlace no encontrado" });
    }

    //  Verifica que haya un usuario asociado
    if (enlace.user) {
      await updateUserStatistics(enlace.user.toString(), userIp);
    } else {
      await updateUserStatistics("681d063debfbeacb5cea4668", userIp);
    }

    return res.redirect(enlace.originalUrl);
  } catch (error) {
    console.error("Error en la redirección:", error);
    return res.status(500).json({ error: "Error interno del server" });
  }
};
