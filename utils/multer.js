import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";
import dotenv from "dotenv";

dotenv.config();

// 🚀 NATIVE RE-ENGINEERING: Parse the connection URL manually into explicit keys
const cloudinaryUrl = process.env.CLOUDINARY_URL;

if (cloudinaryUrl) {
  try {
    // Splits the URL cleanly by removing 'cloudinary://', split keys by colon, and extract cloud name after the '@'
    const cleanUrlString = cloudinaryUrl.replace("cloudinary://", "");
    const [credentials, cloudName] = cleanUrlString.split("@");
    const [apiKey, apiSecret] = credentials.split(":");

    // Inject the raw, unmasked strings directly into the strict SDK parameters
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });

    console.log(
      "🍃 Cloudinary API keys successfully parsed and injected into storage engine!",
    );
  } catch (parseError) {
    console.error(
      "❌ Failed to parse CLOUDINARY_URL string format:",
      parseError.message,
    );
  }
} else {
  console.error(
    "❌ process.env.CLOUDINARY_URL variable is missing in your .env file.",
  );
}

// 2. Configure Cloudinary Storage Engine for Multer
export const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    return {
      folder: "scanme_images",
      format: "png", // Forces file type optimization natively to prevent upload crashes
      public_id: `img-${uniqueSuffix}`,
    };
  },
});

// 3. Create the upload wrapper middleware block
export const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Strict 5MB file capacity constraint gate
});
