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
    default: () => Date.now(),
  },
  clicks: {
    type: Number,
    required: true,
    default: 0,
  },
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
