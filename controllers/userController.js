import User from '../models/User.js';
import Link from '../models/Links.js';
import mongoose from 'mongoose';
import { checkPwnedPassword } from '../utils/checkPwnedPassword.js';

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

    const collection = links.map(link => ({
      idLink: link._id,
      originalUrl: link.originalUrl,
      shorter: `http://localhost:3000/${link.shorter}`,
      clicks: link.clicks,
      visitors: link.visitors.length,
      clickHistory: link.clickHistory,
      date: link.createdAt,
      qrUrl: link.qrUrl,
    }));

    res.status(200).json({
      totalCount,
      collection,
      nextCursor,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno en el servidor' });
  }
};

export const deleteLinkController = async (req, res) => {
  let session;
  try {
    const user = req.user;
    const { linkId, username } = req.params;

    if (!linkId || !username) {
      return res.status(400).json({ error: 'Error en la solicitud' });
    }

    if (user.username !== username) {
      return res.status(403).json({ error: 'No estas autorizado para esto' });
    }

    const existsLink = await Link.exists({ _id: linkId });

    if (!existsLink) {
      return res.status(404).json({ error: 'No existe el enlace' });
    }

    const ownLink = await User.exists({ _id: user.id, shortLinks: linkId });

    if (!ownLink) {
      return res.status(403).json({ error: 'No estas autorizado para esto' });
    }

    session = await mongoose.startSession();
    session.startTransaction();

    try {
      await Link.findByIdAndDelete({ _id: linkId }).session(session);
      await User.findByIdAndUpdate(
        user.id,
        { $pull: { shortLinks: linkId } },
        { new: true },
      ).session(session);

      await session.commitTransaction();
      session.endSession();
      return res.status(200).json({ success: 'Enlace eliminado con exito' });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error) {
    return res.status(500).json({ error: 'error interno del servidor' });
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};

export const usernameValidationController = async (req, res) => {
  try {
    if (req.user) {
      return res
        .status(409)
        .json({ error: 'Nombre de usuario ya está en uso' });
    }
    return res.status(200).json({ success: 'Disponible!' });
  } catch (error) {
    return res.status(500).json({ error: 'error interno del servidor' });
  }
};

export const emailValidationController = async (req, res) => {
  try {
    if (req.userEmail) {
      return res
        .status(409)
        .json({ error: 'Ya existe una cuenta registrada con este correo' });
    }
    return res.status(200).json({ success: 'Disponible!' });
  } catch (error) {
    return res.status(500).json({ error: 'error interno del servidor' });
  }
};

export const passwordValidationControlador = async (req, res) => {
  try {
    const { password } = req.body;
    const isBad = await checkPwnedPassword(password);
    if (isBad)
      return res
        .status(400)
        .json({ error: 'la contraseña se encuentra en Pwned' });

    return res.status(200).json({ success: 'la contraseña es segura' });
  } catch (error) {
    return res.status(500).json({ error: 'Error interno en el servidor' });
  }
};
