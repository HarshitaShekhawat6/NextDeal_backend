// src/models/chat/chat.service.js

const db = require("../../config/db");

// ── Get or create conversation ────────────────────────────────────────────────
const getOrCreateConversation = async ({ listingId, buyerId, sellerId }) => {
  const [existing] = await db.query(
    "SELECT id FROM conversations WHERE listing_id=? AND buyer_id=? AND seller_id=?",
    [listingId, buyerId, sellerId]
  );
  if (existing.length) return { conversation_id: existing[0].id };

  const [result] = await db.query(
    "INSERT INTO conversations (listing_id, buyer_id, seller_id) VALUES (?,?,?)",
    [listingId, buyerId, sellerId]
  );
  return { conversation_id: result.insertId };
};

// ── Verify sender belongs to conversation ─────────────────────────────────────
const getConversationById = async ({ conversationId, userId }) => {
  const [rows] = await db.query(
    "SELECT * FROM conversations WHERE id=? AND (buyer_id=? OR seller_id=?)",
    [conversationId, userId, userId]
  );
  return rows[0] || null;
};

// ── Save message to DB ────────────────────────────────────────────────────────
const saveMessage = async ({ conversationId, senderId, text }) => {
  const [result] = await db.query(
    "INSERT INTO messages (conversation_id, sender_id, text) VALUES (?,?,?)",
    [conversationId, senderId, text.trim()]
  );
  return {
    id:              result.insertId,
    conversation_id: Number(conversationId),
    sender_id:       senderId,
    text:            text.trim(),
    is_read:         0,
    created_at:      new Date().toISOString(),
  };
};

// ── Get sender name + listing title (for FCM push) ───────────────────────────
const getSenderAndListing = async ({ senderId, listingId }) => {
  const [[senderRows], [listingRows]] = await Promise.all([
    db.query("SELECT name FROM users WHERE id=?",     [senderId]),
    db.query("SELECT title FROM listings WHERE id=?", [listingId]),
  ]);
  return {
    senderName:   senderRows[0]?.name  || "New message",
    listingTitle: listingRows[0]?.title || "",
  };
};

// ── Get all conversations for a user ─────────────────────────────────────────
const getConversationsByUserId = async (userId) => {
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
        WHERE conversation_id = c.id
        ORDER BY created_at DESC LIMIT 1)     AS last_message,
       (SELECT created_at FROM messages
        WHERE conversation_id = c.id
        ORDER BY created_at DESC LIMIT 1)     AS last_message_at,
       (SELECT COUNT(*) FROM messages
        WHERE conversation_id = c.id
          AND sender_id != ?
          AND is_read = 0)                    AS unread_count
     FROM conversations c
     JOIN listings l     ON l.id      = c.listing_id
     JOIN users buyer    ON buyer.id  = c.buyer_id
     JOIN users seller   ON seller.id = c.seller_id
     WHERE c.buyer_id = ? OR c.seller_id = ?
     GROUP BY c.id
     ORDER BY last_message_at DESC`,
    [userId, userId, userId]
  );
  return rows;
};

// ── Get messages for a conversation + mark as read ───────────────────────────
const getMessagesByConversationId = async ({ conversationId, userId }) => {
  // Mark incoming messages as read
  await db.query(
    "UPDATE messages SET is_read=1 WHERE conversation_id=? AND sender_id!=?",
    [conversationId, userId]
  );

  const [messages] = await db.query(
    `SELECT m.id, m.conversation_id, m.sender_id, m.text, m.is_read, m.created_at,
            u.name  AS sender_name,
            u.image AS sender_image
     FROM messages m
     JOIN users u ON u.id = m.sender_id
     WHERE m.conversation_id = ?
     ORDER BY m.created_at ASC`,
    [conversationId]
  );
  return messages;
};

// ── Save / update FCM token ───────────────────────────────────────────────────
const saveFcmToken = async ({ userId, token }) => {
  await db.query("UPDATE users SET fcm_token=? WHERE id=?", [token, userId]);
};

// ── Get FCM token for a user ──────────────────────────────────────────────────
const getFcmToken = async (userId) => {
  const [rows] = await db.query(
    "SELECT fcm_token FROM users WHERE id=? AND fcm_token IS NOT NULL",
    [userId]
  );
  return rows[0]?.fcm_token || null;
};

module.exports = {
  getOrCreateConversation,
  getConversationById,
  saveMessage,
  getSenderAndListing,
  getConversationsByUserId,
  getMessagesByConversationId,
  saveFcmToken,
  getFcmToken,
};