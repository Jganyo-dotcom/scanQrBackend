import mongoose from "mongoose";

const scanEventSchema = new mongoose.Schema(
  {
    qrCodeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "QrCode",
      required: true,
    },
    device: {
      type: String,
      default: "Unknown Device",
    },
    browser: {
      type: String,
      default: "Unknown Browser",
    },
    country: {
      type: String,
      default: "Unknown Location",
    },
    countryCode: {
      type: String,
      default: "INT",
    },
    ipAddress: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }, // Automatically logs the exact time of the scan!
);

const ScanEvent = mongoose.model("ScanEvent", scanEventSchema);
export default ScanEvent;
