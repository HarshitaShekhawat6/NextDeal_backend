// src/modules/chat/chat.controller.js

const {
  getOrCreateConversation,
  getConversationById,
  saveMessage,
  getSenderAndListing,
  getConversationsByUserId,
  getMessagesByConversationId,
  saveFcmToken,
  getFcmToken,
} = require("./chat.service");

const { sendPush } = require("../../services/firebase.service");

// ── POST /chat/fcm-token ──────────────────────────────────────────────────────
const storeFcmToken = async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ message: "Token required" });
  try {
    await saveFcmToken({ userId: req.user.userId, token });
    res.json({ success: true });
  } catch (err) {
    console.error("[Chat] storeFcmToken error:", err.message);
    res.status(500).json({ message: err.message });
  }
};

// ── POST /chat/conversation ───────────────────────────────────────────────────
const createConversation = async (req, res) => {
  const buyerId = req.user.userId;
  const { listing_id, seller_id } = req.body;

  if (!listing_id || !seller_id)
    return res.status(400).json({ message: "listing_id and seller_id required" });
  if (buyerId === Number(seller_id))
    return res.status(400).json({ message: "You cannot chat with yourself" });

  try {
    const result = await getOrCreateConversation({
      listingId: listing_id,
      buyerId,
      sellerId:  seller_id,
    });
    res.json(result);
  } catch (err) {
    console.error("[Chat] createConversation error:", err.message);
    res.status(500).json({ message: err.message });
  }
};

// ── POST /chat/messages ───────────────────────────────────────────────────────
const sendMessage = async (req, res) => {
  const senderId = req.user.userId;
  const { conversation_id, text } = req.body;

  if (!conversation_id || !text?.trim())
    return res.status(400).json({ message: "conversation_id and text required" });

  try {
    // Verify sender belongs to this conversation
    const conv = await getConversationById({ conversationId: conversation_id, userId: senderId });
    if (!conv) return res.status(403).json({ message: "Access denied" });

    // Save to DB
    const newMessage = await saveMessage({ conversationId: conversation_id, senderId, text });

    // Send FCM push to the other user
    const receiverId               = conv.buyer_id === senderId ? conv.seller_id : conv.buyer_id;
    const { senderName, listingTitle } = await getSenderAndListing({
      senderId,
      listingId: conv.listing_id,
    });

    await sendPush({
      toUserId: receiverId,
      title:    senderName,
      body:     text.trim().length > 60 ? text.trim().slice(0, 57) + "…" : text.trim(),
      data: {
        type:            "chat",
        conversation_id: String(conversation_id),
        listing_title:   listingTitle,
      },
    });

    res.json(newMessage);
  } catch (err) {
    console.error("[Chat] sendMessage error:", err.message);
    res.status(500).json({ message: err.message });
  }
};

// ── GET /chat/conversations ───────────────────────────────────────────────────
const getConversations = async (req, res) => {
  try {
    const rows = await getConversationsByUserId(req.user.userId);
    res.json(rows);
  } catch (err) {
    console.error("[Chat] getConversations error:", err.message);
    res.status(500).json({ message: err.message });
  }
};

// ── GET /chat/messages/:conversationId ───────────────────────────────────────
const getMessages = async (req, res) => {
  const userId         = req.user.userId;
  const conversationId = req.params.conversationId;

  try {
    // Verify user belongs to this conversation
    const conv = await getConversationById({ conversationId, userId });
    if (!conv) return res.status(403).json({ message: "Access denied" });

    const messages = await getMessagesByConversationId({ conversationId, userId });
    res.json(messages);
  } catch (err) {
    console.error("[Chat] getMessages error:", err.message);
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  storeFcmToken,
  createConversation,
  sendMessage,
  getConversations,
  getMessages,
};