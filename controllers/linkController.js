import { v4 as uuidv4 } from 'uuid';
import Link from '../models/Links.js';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import {
  updateUserStatistics,
  updateUserLinkHistory,
} from '../utils/statisticsUpdater.js';
import { s3 } from '../config/s3.js';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import QRCode from 'qrcode';
import { Jimp } from 'jimp';
import path from 'path';
import { fileURLToPath } from 'url';

// Necesario si usas ESModules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logoPath = path.resolve(__dirname, '../assets/bitmap.png');

export const createShortLink = async (req, res) => {
  let session;
  const shorter = req.body.userCode || uuidv4().substring(0, 6);
  const token = req.header('Authorization')?.replace('Bearer ', '');

  try {
    const { originalUrl } = req.body;
    let user = null;

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        user = await User.findById(decoded.id);
      } catch (error) {
        console.log(error, 'desde el controlador');
        return res.status(401).json({ error: 'Solicitud invalida' });
      }
    }

    const qrBuffer = await QRCode.toBuffer(`http://localhost:5173/${shorter}`, {
      width: 600,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#2f7fff',
        light: '#ffffff',
      },
    });

    //cargar qr en jimp y calcular area
    const qrImage = await Jimp.read(qrBuffer);
    const logoSize = Math.floor(qrImage.bitmap.width * 0.15);
    const logo = await Jimp.read(logoPath);
    logo.resize({ w: logoSize, h: logoSize });

    //colocar logo en el centro
    const x = qrImage.bitmap.width / 2 - logo.bitmap.width / 2;
    const y = qrImage.bitmap.height / 2 - logo.bitmap.height / 2;
    const background = await new Jimp({
      width: logo.bitmap.width + 10,
      height: logo.bitmap.height + 10,
      color: 0xffffffff, // blanco
    });
    background.composite(logo, 5, 5);
    qrImage.composite(background, x - 5, y - 5);

    const finalBuffer = await qrImage.getBuffer('image/png');

    //subida a s3
    const key = `qr-codes/qr-${shorter}-${Date.now()}.png`;
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET,
        Key: key,
        Body: finalBuffer,
        ContentType: 'image/png',
      }),
    );

    const qrUrl = `https://${process.env.AWS_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    const newLink = new Link({
      originalUrl: originalUrl.trim(),
      shorter,
      user: user?.id || '6828a8479fa7700b624a97f1', // Usuario por defecto si no hay user
      qrUrl,
    });

    session = await mongoose.startSession();
    session.startTransaction();
    try {
      await newLink.save({ session });
      await User.findByIdAndUpdate(
        user?.id || '6828a8479fa7700b624a97f1',
        { $push: { shortLinks: newLink._id } },
        { new: true },
      ).session(session);

      await session.commitTransaction();

      const enlace = await Link.findOne({ shorter });
      const idLink = enlace._id;
      const date = enlace.createdAt;
      const clickHistory = enlace.clickHistory;

      const userId = user?.id || '6828a8479fa7700b624a97f1';
      await updateUserLinkHistory(userId, idLink);

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
      throw error;
    }
  } catch (error) {
    console.log(error, 'desde controlador');
    return res.status(500).json({ error: 'Error interno en el servidor' });
  } finally {
    if (session) {
      session.endSession();
    }
  }
};

export const linkRedirect = async (req, res) => {
  try {
    const userIp =
      req.header('X-Forwarded-For') || req.connection.remoteAddress;

    const enlace = await Link.findOneAndUpdate(
      { shorter: req.params.short },
      {
        $inc: { clicks: 1 },
        $addToSet: { visitors: userIp },
        $push: { clickHistory: { ip: userIp, date: new Date() } },
      },
      { new: true },
    );

    if (!enlace) {
      return res.status(404).json({ error: 'Enlace no encontrado' });
    }

    //  Verifica que haya un usuario asociado
    if (enlace.user) {
      await updateUserStatistics(enlace.user.toString(), userIp);
    } else {
      await updateUserStatistics('6828a8479fa7700b624a97f1', userIp);
    }

    return res.redirect(enlace.originalUrl);
  } catch (error) {
    console.error('Error en la redirección:', error);
    return res.status(500).json({ error: 'Error interno del server' });
  }
};

export const liveCodeController = async (req, res) => {
  try {
    console.log('disponible');
    return res.status(200).json({ success: 'Disponible!' });
  } catch (error) {
    return res.status(500).json({ error: 'Error interno en el servidor' });
  }
};
