import express from "express";
import {
  createQrCode,
  getUserQrCodes,
  updateQrDestination,
  deleteQrCode,
  handleRedirect,
  getQrAnalytics,
  uploadImageFile,
} from "../controllers/qrController.js";
import { protect } from "../middleware/authMiddleware.js";
import { upload } from "../../utils/multer.js";

const router = express.Router();

// 1. Creation Gateway -> POST /api/qrs/create
router.post("/create", protect, createQrCode);

// 2. Fetch User History List -> GET /api/qrs/my-qrs
router.get("/my-qrs", protect, getUserQrCodes);

// 3. Dynamic Edit Redirect Pointer Destination -> PATCH /api/qrs/update-destination/:id

// 4. History Row Database Deletion -> DELETE /api/qrs/delete/:id
router.delete("/delete/:id", protect, deleteQrCode);

router.patch("/update-destination/:id", protect, updateQrDestination);

// Gateway for aggregated real-time database queries -> GET /v1/qrs/analytics
router.get("/analytics", protect, getQrAnalytics);

router.get("/:shortId", handleRedirect);

// 🚀 2. REWRITTEN SECURE ROUTE HIGHWAY: Fully protected by your header Bearer tokens middleware
router.post("/upload-image", protect, upload.single("image"), uploadImageFile);

export default router;
