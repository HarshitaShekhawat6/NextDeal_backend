// modules/profile/profile.service.js

const db = require("../../config/db");
const { uploadToCloudinary, deleteFromCloudinary } = require("../../services/cloudinary.service");

// ── GET profile ───────────────────────────────────────────────────────────────
const getProfile = async (userId) => {
  const [rows] = await db.query(
    `SELECT id, name, email, phone, image, bio,
            address1, address2, city, state,
            latitude, longitude, created_at, modified_at
     FROM users WHERE id = ?`,
    [userId]
  );
  return rows[0] || null;
};

// ── UPDATE profile ────────────────────────────────────────────────────────────
const updateProfile = async (userId, fields, imageFile) => {
  const {
    name, email, phone, bio,
    address1, address2, city, state,
    latitude, longitude,
    imageUrl,           // ← URL se aai image (string field)
  } = fields;

  const [current] = await db.query(
    "SELECT image FROM users WHERE id = ?",
    [userId]
  );
  if (!current.length) return null;

  const oldImage = current[0].image;
  let   imagePath = oldImage; // default: keep old

  if (imageFile) {
    // ── Camera / Gallery — file upload to Cloudinary ────────────────────────
    if (oldImage && oldImage.includes("cloudinary")) {
      await deleteFromCloudinary(oldImage);
    }
    const result = await uploadToCloudinary(imageFile.buffer, "profiles");
    imagePath    = result.secure_url;

  } else if (imageUrl && imageUrl.startsWith("http")) {
    // ── URL image — save directly, no Cloudinary upload needed ────────────
    imagePath = imageUrl;
  }

  await db.query(
    `UPDATE users SET
       name        = COALESCE(NULLIF(?, ''), name),
       email       = COALESCE(NULLIF(?, ''), email),
       phone       = COALESCE(NULLIF(?, ''), phone),
       bio         = NULLIF(?, ''),
       address1    = NULLIF(?, ''),
       address2    = NULLIF(?, ''),
       city        = NULLIF(?, ''),
       state       = NULLIF(?, ''),
       latitude    = COALESCE(NULLIF(?, ''), latitude),
       longitude   = COALESCE(NULLIF(?, ''), longitude),
       image       = ?,
       modified_at = ?
     WHERE id = ?`,
    [
      name    || "", email    || "", phone || "",
      bio     || "", address1 || "", address2 || "",
      city    || "", state    || "",
      latitude  != null ? String(latitude)  : "",
      longitude != null ? String(longitude) : "",
      imagePath,
      new Date(),
      userId,
    ]
  );

  return imagePath;
};

// ── HARD DELETE ───────────────────────────────────────────────────────────────
const deleteProfile = async (userId) => {
  const [rows] = await db.query("SELECT image FROM users WHERE id=?", [userId]);
  if (rows[0]?.image?.includes("cloudinary")) {
    await deleteFromCloudinary(rows[0].image);
  }

  const [listingImgs] = await db.query(
    `SELECT li.image_url FROM listing_images li
     JOIN listings l ON l.id = li.listing_id
     WHERE l.user_id = ?`,
    [userId]
  );
  await Promise.all(
    listingImgs
      .filter((r) => r.image_url?.includes("cloudinary"))
      .map((r) => deleteFromCloudinary(r.image_url))
  );

  await db.query("DELETE FROM messages      WHERE sender_id=?",               [userId]);
  await db.query("DELETE FROM conversations WHERE buyer_id=? OR seller_id=?", [userId, userId]);
  await db.query("DELETE FROM wishlist      WHERE user_id=?",                  [userId]);
  await db.query(
    `DELETE FROM listing_images
     WHERE listing_id IN (SELECT id FROM listings WHERE user_id=?)`,
    [userId]
  );
  await db.query("DELETE FROM listings WHERE user_id=?", [userId]);
  await db.query("DELETE FROM users    WHERE id=?",      [userId]);
};

module.exports = { getProfile, updateProfile, deleteProfile };