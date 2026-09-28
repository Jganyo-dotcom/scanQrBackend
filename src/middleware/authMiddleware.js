import jwt from "jsonwebtoken";
import User from "../models/User.js";

// @desc    Protect routes - Verify Authorization Header JWT Token
export const protect = async (req, res, next) => {
  let token;

  try {
    // 1. Check for the Authorization header and ensure it starts with "Bearer"
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      // 2. Extract the raw token string (splits "Bearer <token>" and takes the second part)
      token = req.headers.authorization.split(" ")[1];
    }

    // 3. Check if the token is completely missing
    if (!token) {
      return res.status(401).json({
        status: "fail",
        message: "Not authorized, access token is missing from headers.",
      });
    }

    // 4. Verify the token signature using your JWT_SECRET
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 5. Fetch user details from MongoDB (excluding the hashed password field)
    req.user = await User.findById(decoded.id).select("-password");

    // 6. If the user no longer exists in the DB (e.g. deleted account)
    if (!req.user) {
      return res.status(401).json({
        status: "fail",
        message: "Not authorized, user account no longer exists.",
      });
    }

    // 7. Everything is valid! Proceed to the controller endpoint
    next();
  } catch (error) {
    console.error("Auth Middleware Error:", error.message);

    // Handle expired tokens explicitly
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        status: "fail",
        message: "Session expired. Please log in again.",
      });
    }

    return res.status(401).json({
      status: "fail",
      message: "Not authorized, token verification failed.",
    });
  }
};
