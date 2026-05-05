
const express = require("express");
const http    = require("http");          // ← ADD: socket.io ke liye zaruri
const { Server } = require("socket.io"); // ← ADD: npm install socket.io
const cors    = require("cors");
const db      = require("./config/db");

const app    = express();
const server = http.createServer(app);  

// ── Socket.io setup 
const io = new Server(server, {
  cors: {
    origin: "*",           // production mein apna domain daal dena
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log(" Socket connected:", socket.id);

  // ── Join a conversation room 
  // Frontend emit karta hai: socket.emit("join_room", conversationId)
  socket.on("join_room", (conversationId) => {
    socket.join(`room_${conversationId}`);
    console.log(`User joined room_${conversationId}`);
  });

  // ── Send a message 
  // Frontend emit karta hai:
  //   socket.emit("send_message", { conversation_id, sender_id, text })
  socket.on("send_message", async ({ conversation_id, sender_id, text }) => {
    if (!conversation_id || !sender_id || !text?.trim()) return;

    try {
      // Save to DB
      const [result] = await db.query(
        "INSERT INTO messages (conversation_id, sender_id, text) VALUES (?,?,?)",
        [conversation_id, sender_id, text.trim()]
      );

      const newMessage = {
        id:              result.insertId,
        conversation_id,
        sender_id,
        text:            text.trim(),
        is_read:         0,
        created_at:      new Date().toISOString(),
      };

      io.to(`room_${conversation_id}`).emit("receive_message", newMessage);

    } catch (err) {
      console.error("Socket message error:", err.message);
    }
  });

  socket.on("typing", ({ conversation_id, sender_id }) => {
    socket.to(`room_${conversation_id}`).emit("user_typing", { sender_id });
  });

  socket.on("stop_typing", ({ conversation_id }) => {
    socket.to(`room_${conversation_id}`).emit("user_stop_typing");
  });

  socket.on("disconnect", () => {
    console.log(" Socket disconnected:", socket.id);
  });
});

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

app.use("/api/auth",         require("./models/auth/auth.routes")); 
app.use("/api/users",        require("./models/users/user.routes"));
app.use("/api/listings",     require("./models/listings/listing.routes"));
app.use("/api/wishlist",     require("./models/wishlist/wishlist.routes"));
app.use("/api/categories",   require("./models/categories/category.routes"));
app.use("/api/profile",      require("./models/profile/profile.routes"));   
app.use("/api/chat",         require("./models/chat/chat.routes"));
app.use("/api/search",       require("./models/search/search.routes"));
app.use("/api/home",         require("./models/home/home.routes"));




const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {            
  console.log(` Server running on port ${PORT}`);
});