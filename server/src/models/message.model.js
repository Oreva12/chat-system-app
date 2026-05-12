const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    roomId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "Room",
      required: true,
    },
    sender: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
    },
    body: {
      type:      String,
      required:  true,
      trim:      true,
    },
    type: {
      type:    String,
      enum:    ["text", "image", "file"],
      default: "text",
    },
    readBy: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    ],
    deliveredTo: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    ],
    isDeleted: { type: Boolean, default: false },
    isEdited:  { type: Boolean, default: false },
    editedAt:  { type: Date },
  },
  { timestamps: true }
);

messageSchema.index({ roomId: 1, createdAt: -1 });

module.exports = mongoose.model("Message", messageSchema);