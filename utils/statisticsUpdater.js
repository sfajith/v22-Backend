import mongoose from "mongoose";
import Link from "../models/Links.js";
import User from "../models/User.js";

export const updateUserStatistics = async (userId, userIp) => {
  const [stats] = await Link.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalClicks: { $sum: "$clicks" },
        totalVisitors: { $sum: { $size: "$visitors" } },
      },
    },
  ]);

  if (stats) {
    await User.updateOne(
      { _id: userId },
      {
        $set: {
          "statistics.totalClicks": stats.totalClicks,
          "statistics.totalVisitors": stats.totalVisitors,
        },
        $push: {
          clickAnalitycs: {
            ip: userIp,
            date: new Date(),
          },
        },
      }
    );
  }
};

export const updateUserLinkHistory = async (userId, linkId) => {
  await User.updateOne(
    { _id: userId },
    {
      $push: {
        LinkActivity: {
          link: linkId, // linkId debe ser el ObjectId del nuevo enlace creado
          date: new Date(),
        },
      },
    }
  );
};
