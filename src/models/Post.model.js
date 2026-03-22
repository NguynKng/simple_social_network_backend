const mongoose = require("mongoose");

const postSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  taggedUsers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],

  // 📝 Nội dung bài viết
  content: { type: String, default: "" },
  media: [{ type: String, default: "" }],
  videos: [{ type: String, default: "" }],
  mediaOrder: [
    {
      type: {
        type: String,
        enum: ["image", "video"],
      },
      index: {
        type: Number,
        min: 0,
      },
    },
  ],

  reactions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Reaction" }],
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Comment" }],

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Post", postSchema);
