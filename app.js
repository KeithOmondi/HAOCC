// ===============================
// Imports
// ===============================
import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import { errorMiddleware } from "./middlewares/errorMiddlewares.js";

// Routers
import authRouter from "./routes/authRouter.js";
import userRouter from "./routes/userRouter.js";
import propertyRouter from "./routes/propertyRouter.js";
import categoryRouter from "./routes/categoryRouter.js";
import bookingRouter from "./routes/bookingRouter.js";
import adminDashboardRouter from "./routes/adminDashboardRouter.js";
import blogRouter from "./routes/blogRouter.js";
import eventRouter from "./routes/eventRouter.js";
import careerRouter from "./routes/careerRouter.js";
import adminRouter from "./routes/adminRouter.js";

// Services
import { removeUnverifiedAccounts } from "./services/removeUnverifiedAccounts.js";
import { globalLimiter, limiter, loginLimiter } from "./middlewares/rateLimiter.js";

// ===============================
// Config
// ===============================
dotenv.config({ path: "./config/.env" });
const app = express();

// ===============================
// CORS Setup
// ===============================
const allowedOrigins = ["https://haoc.vercel.app", "http://localhost:5173"];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // Postman or server requests
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS policy: Origin ${origin} not allowed`));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
    exposedHeaders: ["Set-Cookie"],
  })
);

// ===============================
// Middlewares
// ===============================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(globalLimiter);

// Static uploads
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Debug logs
app.use((req, res, next) => {
  console.log("📥 Incoming request:", req.originalUrl, req.body);
  next();
});

// ===============================
// Routes
// ===============================
app.use("/api/v1/auth", authRouter, limiter, loginLimiter);
app.use("/api/v1/user", userRouter);
app.use("/api/v1/properties", propertyRouter);
app.use("/api/v1/categories", categoryRouter);
app.use("/api/v1/bookings", bookingRouter);
app.use("/api/v1/admin", adminDashboardRouter);
app.use("/api/v1/blogs", blogRouter);
app.use("/api/v1/events", eventRouter);
app.use("/api/v1/careers", careerRouter);
app.use("/api/v1/profile", adminRouter);

// ===============================
// Services
// ===============================
removeUnverifiedAccounts();

// ===============================
// Error Middleware
// ===============================
app.use(errorMiddleware);

// ===============================
// Export App
// ===============================
export default app;
