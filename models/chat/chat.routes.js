// src/modules/chat/chat.routes.js

const express = require("express");
const router  = express.Router();
const auth    = require("../auth/auth.middleware");
const {
  storeFcmToken,
  createConversation,
  sendMessage,
  getConversations,
  getMessages,
} = require("./chat.controller");

// All chat routes require auth
router.use(auth);

router.post("/fcm-token",              storeFcmToken);       // Save FCM token
router.post("/conversation",           createConversation);  // Get or create conversation
router.post("/messages",               sendMessage);         // Send a message
router.get("/conversations",           getConversations);    // Get all conversations
router.get("/messages/:conversationId", getMessages);        // Get messages for a conversation

module.exports = router;