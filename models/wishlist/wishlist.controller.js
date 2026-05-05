// modules/wishlist/wishlist.controller.js

const {
  getWishlistByUser,
  addToWishlist,
  removeFromWishlist,
  checkWishlisted,
} = require("./wishlist.service");

const getUserId = (req) =>
  req.user?.userId ?? req.user?.id ?? req.user?.user_id ?? null;

// ── GET /wishlist ─────────────────────────────────────────────────────────────
const getWishlist = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const data = await getWishlistByUser(userId);
    res.json({ success: true, data, count: data.length });
  } catch (err) {
    console.error("GET /wishlist ERROR:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /wishlist/:listingId ─────────────────────────────────────────────────
const addWishlist = async (req, res) => {
  try {
    const userId    = getUserId(req);
    const listingId = Number(req.params.listingId);

    if (!userId)               return res.status(401).json({ success: false, message: "Unauthorized" });
    if (!listingId || isNaN(listingId)) return res.status(400).json({ success: false, message: "Invalid listingId" });

    const result = await addToWishlist(userId, listingId);
    if (!result) return res.status(404).json({ success: false, message: "Listing not found" });

    res.json({ success: true, message: "Added to wishlist" });
  } catch (err) {
    console.error("POST /wishlist ERROR:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE /wishlist/:listingId ───────────────────────────────────────────────
const removeWishlist = async (req, res) => {
  try {
    const userId    = getUserId(req);
    const listingId = Number(req.params.listingId);

    if (!userId)               return res.status(401).json({ success: false, message: "Unauthorized" });
    if (!listingId || isNaN(listingId)) return res.status(400).json({ success: false, message: "Invalid listingId" });

    const removed = await removeFromWishlist(userId, listingId);
    if (!removed) return res.status(404).json({ success: false, message: "Item not in wishlist" });

    res.json({ success: true, message: "Removed from wishlist" });
  } catch (err) {
    console.error("DELETE /wishlist ERROR:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /wishlist/check/:listingId ────────────────────────────────────────────
const checkWishlist = async (req, res) => {
  try {
    const userId    = getUserId(req);
    const listingId = Number(req.params.listingId);

    if (!userId)               return res.status(401).json({ success: false, message: "Unauthorized" });
    if (!listingId || isNaN(listingId)) return res.status(400).json({ success: false, message: "Invalid listingId" });

    const isWishlisted = await checkWishlisted(userId, listingId);
    res.json({ success: true, isWishlisted });
  } catch (err) {
    console.error("CHECK /wishlist ERROR:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getWishlist, addWishlist, removeWishlist, checkWishlist };