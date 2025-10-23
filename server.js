import { createServer } from "http";
import { Server } from "socket.io";
import cookie from "cookie";

import app from "./app.js"; // ✅ default import
import { connectDB } from "./db/db.js";

const PORT = process.env.PORT || 8000;

// ===============================
// DB Connection
// ===============================
connectDB();

// ===============================
// Socket.IO Setup
// ===============================
const server = createServer(app);
const allowedOrigins = ["https://haoc.vercel.app", "http://localhost:5173"];

const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ["GET", "POST"], credentials: true },
});

// Authenticate sockets via cookies
io.use((socket, next) => {
  const cookies = socket.handshake.headers.cookie;
  if (!cookies) return next(new Error("Unauthorized"));

  const parsed = cookie.parse(cookies);
  const token = parsed.token; 
  if (!token) return next(new Error("Unauthorized"));

  socket.userToken = token;
  next();
});

// Socket events
io.on("connection", (socket) => {
  console.log("✅ Client connected:", socket.id);

  socket.on("joinRoom", (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  socket.on("sendMessage", (data) =>
    io.to(data.receiverId).emit("newMessage", {
      _id: Date.now().toString(),
      sender: socket.id,
      text: data.text,
      isRead: false,
    })
  );

  socket.on("typing", ({ receiverId }) => io.to(receiverId).emit("typing", { from: socket.id }));
  socket.on("stopTyping", ({ receiverId }) => io.to(receiverId).emit("stopTyping"));
  socket.on("markAsRead", ({ messageId, receiverId }) => io.to(receiverId).emit("messageRead", { messageId }));

  socket.on("disconnect", () => console.log("❌ Client disconnected:", socket.id));
});

// ===============================
// Start Server
// ===============================
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
