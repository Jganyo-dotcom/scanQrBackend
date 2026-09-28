import express from "express";
// Note: Node ES Modules require the explicit '.js' extension for local files!
import {
  registerUser,
  loginUser,
  logoutUser,
  checkAuthStatus,
  getUserProfile,
  updateUserProfile,
  updateUserPassword,
} from "../controllers/authController.js";

const router = express.Router();
import { protect } from "../middleware/authMiddleware.js";

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", logoutUser);
router.get("/status", checkAuthStatus); // This is what your Dashboard calls on mount!

router.get("/profile", protect, getUserProfile);
router.put("/profile", protect, updateUserProfile);
router.put("/password", protect, updateUserPassword);

export default router;
