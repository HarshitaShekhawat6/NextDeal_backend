
const express = require("express");
const router  = express.Router();
const path    = require("path");
const db      = require("../config/db");
const auth    = require("../models/auth/auth.middleware");  
const admin   = require("firebase-admin");                   

// Firebase init
if (!admin.apps || !admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(
      require("../services/firebase-service-account.json")  
    ),
  });
}

// ── FCM push helper ───────────────────────────────────────────────────────────
const sendPush = async ({ toUserId, title, body, data = {} }) => {
  try {
    const [rows] = await db.query(
      "SELECT fcm_token FROM users WHERE id=? AND fcm_token IS NOT NULL",
      [toUserId]
    );
    if (!rows.length) return;

    await admin.messaging().send({
      token:        rows[0].fcm_token,
      notification: { title, body },
      data,
      android: { priority: "high" },
      apns:    { payload: { aps: { sound: "default" } } },
    });
  } catch (err) {
    console.log("[FCM]", err.message);
  }
};

// ── Store FCM token ───────────────────────────────────────────────────────────
router.post("/fcm-token", auth, async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ message: "Token required" });
  try {
    await db.query("UPDATE users SET fcm_token=? WHERE id=?", [token, req.user.userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Get or create conversation ────────────────────────────────────────────────
router.post("/conversation", auth, async (req, res) => {
  const buyerId = req.user.userId;
  const { listing_id, seller_id } = req.body;

  if (!listing_id || !seller_id)
    return res.status(400).json({ message: "listing_id and seller_id required" });
  if (buyerId === Number(seller_id))
    return res.status(400).json({ message: "You cannot chat with yourself" });

  try {
    const [existing] = await db.query(
      "SELECT id FROM conversations WHERE listing_id=? AND buyer_id=? AND seller_id=?",
      [listing_id, buyerId, seller_id]
    );
    if (existing.length)
      return res.json({ conversation_id: existing[0].id });

    const [result] = await db.query(
      "INSERT INTO conversations (listing_id, buyer_id, seller_id) VALUES (?,?,?)",
      [listing_id, buyerId, seller_id]
    );
    res.json({ conversation_id: result.insertId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Send message (REST) ───────────────────────────────────────────────────────
// Frontend REST se message bhejta hai → DB save → socket broadcast → FCM push
router.post("/messages", auth, async (req, res) => {
  const senderId = req.user.userId;
  const { conversation_id, text } = req.body;

  if (!conversation_id || !text?.trim())
    return res.status(400).json({ message: "conversation_id and text required" });

  try {
    // Verify sender is in this conversation
    const [conv] = await db.query(
      "SELECT * FROM conversations WHERE id=? AND (buyer_id=? OR seller_id=?)",
      [conversation_id, senderId, senderId]
    );
    if (!conv.length) return res.status(403).json({ message: "Access denied" });

    // Save to DB
    const [result] = await db.query(
      "INSERT INTO messages (conversation_id, sender_id, text) VALUES (?,?,?)",
      [conversation_id, senderId, text.trim()]
    );

    const newMessage = {
      id:              result.insertId,
      conversation_id: Number(conversation_id),
      sender_id:       senderId,
      text:            text.trim(),
      is_read:         0,
      created_at:      new Date().toISOString(),
    };

    // Send FCM to the other person
    const c          = conv[0];
    const receiverId = c.buyer_id === senderId ? c.seller_id : c.buyer_id;

    const [[sender], [listing]] = await Promise.all([
      db.query("SELECT name FROM users WHERE id=?",    [senderId]),
      db.query("SELECT title FROM listings WHERE id=?", [c.listing_id]),
    ]);

    await sendPush({
      toUserId: receiverId,
      title:    sender[0]?.name || "New message",
      body:     text.trim().length > 60 ? text.trim().slice(0, 57) + "…" : text.trim(),
      data: {
        type:            "chat",
        conversation_id: String(conversation_id),
        listing_title:   listing[0]?.title || "",
      },
    });

    res.json(newMessage);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Get all conversations ─────────────────────────────────────────────────────
router.get("/conversations", auth, async (req, res) => {
  const userId = req.user.userId;
  try {
    const [rows] = await db.query(
      `SELECT
         c.id              AS conversation_id,
         c.listing_id,
         c.buyer_id,
         c.seller_id,
         l.title           AS listing_title,
         l.price           AS listing_price,
         buyer.name        AS buyer_name,
         buyer.image       AS buyer_image,
         seller.name       AS seller_name,
         seller.image      AS seller_image,
         (SELECT text FROM messages
          WHERE conversation_id=c.id
          ORDER BY created_at DESC LIMIT 1) AS last_message,
         (SELECT created_at FROM messages
          WHERE conversation_id=c.id
          ORDER BY created_at DESC LIMIT 1) AS last_message_at,
         (SELECT COUNT(*) FROM messages
          WHERE conversation_id=c.id
            AND sender_id != ?
            AND is_read=0)               AS unread_count
       FROM conversations c
       JOIN listings l     ON l.id      = c.listing_id
       JOIN users buyer    ON buyer.id  = c.buyer_id
       JOIN users seller   ON seller.id = c.seller_id
       WHERE c.buyer_id=? OR c.seller_id=?
       ORDER BY last_message_at DESC`,
      [userId, userId, userId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Get messages for a conversation ──────────────────────────────────────────
router.get("/messages/:conversationId", auth, async (req, res) => {
  const userId         = req.user.userId;
  const conversationId = req.params.conversationId;
  try {
    const [conv] = await db.query(
      "SELECT * FROM conversations WHERE id=? AND (buyer_id=? OR seller_id=?)",
      [conversationId, userId, userId]
    );
    if (!conv.length) return res.status(403).json({ message: "Access denied" });

    await db.query(
      "UPDATE messages SET is_read=1 WHERE conversation_id=? AND sender_id!=?",
      [conversationId, userId]
    );

    const [messages] = await db.query(
      `SELECT m.id, m.conversation_id, m.sender_id, m.text, m.is_read, m.created_at,
              u.name AS sender_name, u.image AS sender_image
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.conversation_id=?
       ORDER BY m.created_at ASC`,
      [conversationId]
    );
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;