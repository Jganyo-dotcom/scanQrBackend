import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    plan: {
      type: String,
      required: true,
      default: "free",
      enum: ["premium", "free"],
    },
    numeberOfPictures: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

const User = mongoose.model("User", userSchema);
export default User;
