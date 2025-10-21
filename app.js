import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import cookie from "cookie";
import path from "path";
import { fileURLToPath } from "url";

import { connectDB } from "./db/db.js";
import { errorMiddleware } from "./middlewares/errorMiddlewares.js";

// Routers
import authRouter from "./routes/authRouter.js";
import userRouter from "./routes/userRouter.js";
import propertyRouter from "./routes/propertyRouter.js"
import categoryRouter from "./routes/categoryRouter.js"
import bookingRouter from "./routes/bookingRouter.js"
import adminDashboardRouter from "./routes/adminDashboardRouter.js"
import blogRouter from "./routes/blogRouter.js"
import eventRouter from "./routes/eventRouter.js"
import careerRouter from "./routes/careerRouter.js"
import adminRouter from "./routes/adminRouter.js"


// Services
import { removeUnverifiedAccounts } from "./services/removeUnverifiedAccounts.js";
import { globalLimiter, limiter, loginLimiter } from "./middlewares/rateLimiter.js";

// ===============================
// App + Config
// ===============================
dotenv.config({ path: "./config/.env" });

export const app = express();

// ✅ CORS setup
app.use(
  cors({
    origin: "http://localhost:5173", // frontend URL
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

// ✅ Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
// ✅ Apply Global Rate Limiter
app.use(globalLimiter);

// ✅ Static uploads
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ✅ Debug logs
app.use((req, res, next) => {
  console.log("📥 Incoming request:");
  console.log("🔗 URL:", req.originalUrl);
  console.log("📦 Body:", req.body);
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



// Services

removeUnverifiedAccounts();

// ===============================
// DB connection
// ===============================
connectDB();

// ===============================
// Socket.IO setup
// ===============================
const PORT = process.env.PORT || 8000;
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    credentials: true,
  },
});

// ✅ Authenticate sockets via cookies
io.use((socket, next) => {
  const cookies = socket.handshake.headers.cookie;
  if (cookies) {
    const parsed = cookie.parse(cookies);
    const token = parsed["token"]; // 👈 adjust to your cookie name
    if (token) {
      socket.userToken = token;
      return next();
    }
  }
  return next(new Error("Unauthorized"));
});

// ✅ Socket events
io.on("connection", (socket) => {
  console.log("✅ Client connected:", socket.id);

  // Example: join room
  socket.on("joinRoom", (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  // Example: send message
  socket.on("sendMessage", (data) => {
    io.to(data.receiverId).emit("newMessage", {
      _id: Date.now().toString(),
      sender: socket.id,
      text: data.text,
      isRead: false,
    });
  });

  // Typing indicators
  socket.on("typing", ({ receiverId }) => {
    io.to(receiverId).emit("typing", { from: socket.id });
  });

  socket.on("stopTyping", ({ receiverId }) => {
    io.to(receiverId).emit("stopTyping");
  });

  // Mark message as read
  socket.on("markAsRead", ({ messageId, receiverId }) => {
    io.to(receiverId).emit("messageRead", { messageId });
  });

  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
  });
});

// ===============================
// Error middleware
// ===============================
app.use(errorMiddleware);

// ===============================
// Start server
// ===============================
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
