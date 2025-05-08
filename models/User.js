import mongoose, { Schema } from "mongoose";

const userSchema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  registeredAt: {
    type: Date,
    default: () => Date.now(),
  },
  shortLinks: [
    {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Link" }],
      default: [],
    },
  ],
  tokenVersion: {
    type: Number,
    default: 0,
  },
  statistics: {
    totalClicks: {
      type: Number,
      default: 0,
    },
    totalVisitors: {
      type: Number,
      default: 0,
    },
  },
});

const User = mongoose.model("User", userSchema);

export default User;
