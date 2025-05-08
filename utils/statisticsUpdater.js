import mongoose from "mongoose";
import Link from "../models/Links.js";
import User from "../models/User.js";

export const updateUserStatistics = async (userId) => {
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
      }
    );
  }
};
