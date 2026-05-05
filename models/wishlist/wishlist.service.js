// modules/wishlist/wishlist.service.js

const db       = require("../../config/db");
const BASE_URL = process.env.BASE_URL || "http://10.0.2.2:5000";

const resolveUrl = (url) => {
  if (!url) return null;
  return url.startsWith("http") ? url : `${BASE_URL}/${url}`;
};

// ── GET full wishlist ─────────────────────────────────────────────────────────
const getWishlistByUser = async (userId) => {
  const [rows] = await db.query(
    `SELECT
      w.id            AS wishlist_id,
      w.created_at    AS saved_at,
      l.id            AS listing_id,
      l.title, l.price, l.location, l.condition,
      l.category_slug, l.description,
      COALESCE(u.name, 'Seller') AS seller_name,
      u.phone                    AS seller_phone,
      u.image                    AS seller_avatar,
      li.image_url               AS image
    FROM wishlist w
    JOIN     listings        l  ON l.id = w.listing_id
    LEFT JOIN users          u  ON u.id = l.user_id
    LEFT JOIN listing_images li ON li.listing_id = l.id
    WHERE w.user_id = ?
    GROUP BY w.id
    ORDER BY w.created_at DESC`,
    [userId]
  );

  return rows.map((row) => ({
    ...row,
    image: resolveUrl(row.image),
    seller: {
      name:   row.seller_name  || null,
      phone:  row.seller_phone || null,
      avatar: resolveUrl(row.seller_avatar),
    },
  }));
};

// ── ADD to wishlist ───────────────────────────────────────────────────────────
const addToWishlist = async (userId, listingId) => {
  const [listing] = await db.query(
    "SELECT id FROM listings WHERE id = ?", [listingId]
  );
  if (!listing.length) return null; // listing not found

  await db.query(
    "INSERT IGNORE INTO wishlist (user_id, listing_id) VALUES (?, ?)",
    [userId, listingId]
  );
  return true;
};

// ── REMOVE from wishlist ──────────────────────────────────────────────────────
const removeFromWishlist = async (userId, listingId) => {
  const [result] = await db.query(
    "DELETE FROM wishlist WHERE user_id = ? AND listing_id = ?",
    [userId, listingId]
  );
  return result.affectedRows > 0;
};

// ── CHECK if wishlisted ───────────────────────────────────────────────────────
const checkWishlisted = async (userId, listingId) => {
  const [rows] = await db.query(
    "SELECT id FROM wishlist WHERE user_id = ? AND listing_id = ?",
    [userId, listingId]
  );
  return rows.length > 0;
};

module.exports = { getWishlistByUser, addToWishlist, removeFromWishlist, checkWishlisted };