import express from "express";
import {
  createQrCode,
  getUserQrCodes,
  updateQrDestination,
  deleteQrCode,
  handleRedirect,
} from "../controllers/qrController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// 1. Creation Gateway -> POST /api/qrs/create
router.post("/create", protect, createQrCode);

// 2. Fetch User History List -> GET /api/qrs/my-qrs
router.get("/my-qrs", protect, getUserQrCodes);

// 3. Dynamic Edit Redirect Pointer Destination -> PATCH /api/qrs/update-destination/:id

// 4. History Row Database Deletion -> DELETE /api/qrs/delete/:id
router.delete("/delete/:id", protect, deleteQrCode);

router.patch("/update-destination/:id", protect, updateQrDestination);

router.get("/:shortId", handleRedirect);

export default router;
