import mongoose from "mongoose";

const qrCodeSchema = new mongoose.Schema(
  {
    // Points to the logged-in user. If null, it was made by a Guest.
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      default: "Untitled QR Code",
    },
    qrType: {
      type: String,
      required: true,
      enum: ["url", "wifi", "vcard", "text"], // Matches the 4 types currently on your frontend
    },
    isDynamic: {
      type: Boolean,
      required: true,
      default: false,
    },
    // For Static: stores the raw code value. For Dynamic: stores the user's target destination website.
    contentData: {
      type: String,
      required: true,
    },
    // The unique 6-character random token for short links (e.g., "ab79x1")
    shortId: {
      type: String,
      unique: true,
      sparse: true, // Prevents conflicts with null values on static codes
    },
    scanCount: {
      type: Number,
      default: 0,
    },
    customization: {
      foregroundColor: { type: String, default: "#0f172a" },
      backgroundColor: { type: String, default: "#ffffff" },
      dotStyle: { type: String, default: "square" },
    },
  },
  { timestamps: true },
);

const QrCode = mongoose.model("QrCode", qrCodeSchema);
export default QrCode;
