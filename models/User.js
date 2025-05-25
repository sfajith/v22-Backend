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
    default: Date.now,
    required: true,
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
  LinkActivity: [
    {
      link: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Link",
      },
      date: {
        type: Date,
        default: Date.now,
        required: true,
      },
    },
  ],
  clickAnalitycs: [
    {
      ip: String,
      date: {
        type: Date,
        default: Date.now,
        required: true,
      },
    },
  ],
  isVerified: {
    type: Boolean,
    default: false,
    required: true,
  },
  emailVerificationToken: {
    type: String,
  },
  emailVerificationExpires: {
    type: Date,
  },
  forgotPasswordToken: {
    type: String,
  },
  forgotPasswordExpires: {
    type: Date,
  },
  olderPasswords: [
    {
      older: {
        type: String,
        required: true,
      },
      changedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  failLogin: {
    count: {
      type: Number,
      default: 0,
      required: true,
    },
    lastAttempt: {
      type: Date,
      default: Date.now,
    },
    blockedUntil: {
      type: Date,
      default: null,
    },
  },
});

const User = mongoose.model("User", userSchema);

export default User;
