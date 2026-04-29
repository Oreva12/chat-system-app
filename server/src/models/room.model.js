const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Room name is required"],
      unique: true,
      trim: true,
      minlength: [3, "Room name must be at least 3 characters"],
      maxlength: [50, "Room name cannot exceed 50 characters"],
    },
    description: {
      type: String,
      default: "",
      maxlength: [200, "Description cannot exceed 200 characters"],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    isPrivate: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Index for fast lookup by name
//roomSchema.index({ name: 1 });

module.exports = mongoose.model("Room", roomSchema);