import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { connectDB } from "./src/config/db.js";
import cookieParser from "cookie-parser";
import authRouter from "./src/router/authRouter.js";
import qrcodeRoute from "./src/router/qrRoutes.js";
import morgan from "morgan"; // 1. Import morgan

dotenv.config();

const app = express();

// 2. Use morgan middleware (using the concise "dev" colored format)

app.use(morgan("dev"));

// Middleware

app.use(express.json());

// 1. Gather all allowed origins into a clean array framework
const rawFrontendUrl = process.env.FRONTEND_URL 

// Clean the string (strips trailing slash if any accidental configs remain)
const cleanFrontendUrl = rawFrontendUrl.endsWith("/")
  ? rawFrontendUrl.slice(0, -1)
  : rawFrontendUrl;

const allowedOrigins = [
  "http://localhost:5173", // Local development environment
  "http://127.0.0.1:5173", // Alternative local tracking environment layout
  cleanFrontendUrl, // Production Netlify deployment domain link
];

// 2. Configure CORS to dynamically check if the incoming request matches our whitelist array
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server tools)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true); // Approved! Domain matches whitelist
      } else {
        return callback(
          new Error("Blocked by CORS security network guidelines."),
        );
      }
    },
    credentials: true, // Retained parameters to keep infrastructure ready
  }),
);


app.use(cookieParser()); // Allows Express to read req.cookies

// Database Connection
connectDB();

// Health Check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date() });
});

app.use("/v1/auth", authRouter);
app.use("/v1/qrs", qrcodeRoute);
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
