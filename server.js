import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { connectDB } from "./src/config/db.js";
import cookieParser from "cookie-parser";
import authRouter from "./src/router/authRouter.js";
import qrcodeRoute from "./src/router/qrRoutes.js"
import morgan from 'morgan'; // 1. Import morgan

dotenv.config();

const app = express();




// 2. Use morgan middleware (using the concise "dev" colored format)

app.use(morgan('dev'));


// Middleware

app.use(express.json());
app.use(
  cors({
    origin: process.env.FRONTEND_URL ?? "http://localhost:5173",
    credentials: true, // Crucial: Allows HttpOnly cookies to pass back and forth
  }),
);
app.use(express.json());
app.use(cookieParser()); // Allows Express to read req.cookies

// Database Connection
connectDB();

// Health Check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date() });
});

app.use("/v1/auth", authRouter);
app.use("/v1/qrs", qrcodeRoute)
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
