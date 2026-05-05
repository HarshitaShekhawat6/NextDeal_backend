// modules/auth/auth.service.js

const db = require("../../config/db");

const findUserByPhone = async (phone) => {
  const [rows] = await db.query(
    "SELECT id, phone, name, image FROM users WHERE phone = ?", // ← image ADD
    [phone]
  );
  return rows[0] || null;
};

const createUser = async (phone) => {
  const [result] = await db.query(
    "INSERT INTO users (phone) VALUES (?)",
    [phone]
  );
  return result.insertId;
};

module.exports = { findUserByPhone, createUser };