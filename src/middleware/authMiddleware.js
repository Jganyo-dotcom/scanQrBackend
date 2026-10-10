import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import User from "../models/User.js";
import ApiKey from "../models/ApiKey.js"; // 1. Import our new multi-key collection

export const protect = async (req, res, next) => {
  try {
    const incomingApiKey = req.headers["x-api-key"];

    // 🚀 SCALING CHECK: Validate automated script keys against the independent collections model
    if (incomingApiKey) {
      if (!incomingApiKey.startsWith("dj_live_")) {
        return res.status(401).json({
          status: "fail",
          message: "Malformed API key architecture format.",
        });
      }

      // Hash the incoming plaintext key string to run a safe collection comparison lookup
      const computedHash = crypto
        .createHash("sha256")
        .update(incomingApiKey)
        .digest("hex");

      // Look up key across database tokens collection
      const targetKeyRecord = await ApiKey.findOne({ keyHash: computedHash });

      if (!targetKeyRecord) {
        return res
          .status(401)
          .json({ status: "fail", message: "Invalid Developer API Key." });
      }

      // ⚠️ PREMIUM LIFECYCLE CHECK: Deny access instantly if the developer paused/deactivated this specific key!
      if (!targetKeyRecord.isActive) {
        return res.status(403).json({
          status: "fail",
          message:
            "This API Key has been temporarily paused or deactivated by the account holder.",
        });
      }

      // Automatically bump the lastUsed timestamp natively in the background log
      targetKeyRecord.lastUsed = new Date();
      await targetKeyRecord.save();

      // Bind the key owner's user details context straight onto the execution thread
      const apiUser = await User.findById(targetKeyRecord.userId).select(
        "-password",
      );
      req.user = apiUser;
      return next();
    }

    // 🚀 FALLBACK UI CHECK: Handle standard React Frontend header tokens
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        status: "fail",
        message: "Access denied. Credentials token missing.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");

    if (!req.user) {
      return res.status(401).json({
        status: "fail",
        message: "Authorized account context no longer exists.",
      });
    }

    if (req.user.numeberOfPictures > 10) {
      return res.status(401).json({
        status: "fail",
        message: "Authorized account context no longer exists.",
      });
    }

    next();
  } catch (error) {
    console.error("Global Protection Layer Error:", error.message);
    return res.status(401).json({
      status: "fail",
      message: "Authentication validation exception occurred.",
    });
  }
};

export const balaceOnPicture = async (req, res, next) => {
  try {
    // const incomingApiKey = req.headers["x-api-key"];

    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        status: "fail",
        message: "Login or register to upload a picture.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");

    if (req.user.numeberOfPictures > 15) {
      return res.status(401).json({
        status: "success",
        message:
          "Free Tier limit reached (15 picture uploaded). Please upgrade to Premium to upload more pictures.",
      });
    }

    next();
  } catch (error) {
    console.error("Global Protection Layer Error:", error.message);
    return res.status(401).json({
      status: "fail",
      message: "Authentication validation exception occurred.",
    });
  }
};
