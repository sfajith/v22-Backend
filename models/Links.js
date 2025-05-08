import mongoose from "mongoose";

const LinkSchema = new mongoose.Schema({
  originalUrl: {
    type: String,
    required: true,
  },
  shorter: {
    type: String,
    required: true,
    unique: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    required: true,
  },
  clicks: {
    type: Number,
    default: 0,
  },
  clickHistory: [
    {
      ip: String,
      date: {
        type: Date,
        default: Date.now,
        required: true,
      },
    },
  ],
  visitors: {
    type: [String],
    default: [],
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
});

const Link = mongoose.model("Link", LinkSchema);

export default Link;
