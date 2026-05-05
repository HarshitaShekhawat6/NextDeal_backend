// modules/users/user.service.js

const db   = require("../../config/db");
const path = require("path");
const fs   = require("fs");

const getUserById = async (id) => {
  const [rows] = await db.query(
    "SELECT id, name, email, phone, image, address1, address2, city, state, bio, latitude, longitude, created_at, modified_at FROM users WHERE id = ?",
    [id]
  );
  return rows[0] || null;
};

const getAllUsers = async () => {
  const [rows] = await db.query("SELECT id, name, email, phone FROM users");
  return rows;
};

const updateUserById = async (id, fields, imageFile) => {
  const { name, email, phone, bio, address1, address2, city, state, latitude, longitude } = fields;

  const [current] = await db.query("SELECT image FROM users WHERE id = ?", [id]);
  if (!current.length) return null;

  const oldImage = current[0].image;
  let imagePath  = oldImage;

  if (imageFile) {
    imagePath = `/uploads/profiles/${imageFile.filename}`;
    if (oldImage) {
      const oldPath = path.join(__dirname, "..", "..", oldImage);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
  }

  await db.query(
    `UPDATE users SET
      name        = COALESCE(?, name),
      email       = COALESCE(?, email),
      phone       = COALESCE(?, phone),
      bio         = ?,
      address1    = ?,
      address2    = ?,
      city        = ?,
      state       = ?,
      latitude    = COALESCE(?, latitude),
      longitude   = COALESCE(?, longitude),
      image       = ?,
      modified_at = ?
    WHERE id = ?`,
    [
      name || null, email || null, phone || null,
      bio || null, address1 || null, address2 || null,
      city || null, state || null,
      latitude || null, longitude || null,
      imagePath, new Date(), id,
    ]
  );

  return imagePath;
};

const deleteUserById = async (id) => {
  await db.query("DELETE FROM wishlist WHERE user_id = ?", [id]);
  await db.query("DELETE FROM users WHERE id = ?", [id]);
};

module.exports = { getAllUsers, getUserById, updateUserById, deleteUserById };