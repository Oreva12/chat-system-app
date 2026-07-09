const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema(
  {
    name: {
      type:      String,
      unique:    true,
      trim:      true,
      maxlength: [100, "Room name cannot exceed 50 characters"],
    },
    description: {
      type:      String,
      default:   "",
      maxlength: [200, "Description cannot exceed 200 characters"],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  "User",
    },
    members: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    ],
    admins: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    ],
    pendingMembers: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    ],
    invitedMembers: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    ],

    // Room type
    type: {
      type:    String,
      enum:    ["public", "private", "invite", "direct"],
      default: "public",
    },

    // Legacy flags kept for compatibility
    isPrivate: { type: Boolean, default: false },
    isDirect:  { type: Boolean, default: false },
  },
  { timestamps: true }
);


module.exports = mongoose.model("Room", roomSchema);