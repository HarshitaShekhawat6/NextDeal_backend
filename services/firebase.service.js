// src/services/firebase.service.js

const admin = require("firebase-admin");
const db    = require("../config/db");

// ── Init Firebase Admin once 
if (!admin.apps.length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT 
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    : require("./firebase-service-account.json.json");
    
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// ── Send FCM push notification 
const sendPush = async ({ toUserId, title, body, data = {} }) => {
  try {
    const [rows] = await db.query(
      "SELECT fcm_token FROM users WHERE id=? AND fcm_token IS NOT NULL",
      [toUserId]
    );
    if (!rows.length) return; // user has no FCM token — skip silently

    await admin.messaging().send({
      token:        rows[0].fcm_token,
      notification: { title, body },
      data,
      android: { priority: "high" },
      apns:    { payload: { aps: { sound: "default" } } },
    });
  } catch (err) {
    // Never crash the app if push fails — just log it
    console.log("[FCM] Push failed:", err.message);
  }
};

module.exports = { sendPush };