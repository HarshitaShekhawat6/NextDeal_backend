// modules/listings/listing.service.js

const db = require("../../config/db");
const { uploadToCloudinary } = require("../../services/cloudinary.service");

const BASE_URL = process.env.BASE_URL || "http://10.0.2.2:5000";
const resolveUrl = (img) => img?.startsWith("http") ? img : `${BASE_URL}/${img}`;

const formatListing = (row) => ({
  ...row,
  images: row.images ? row.images.split(",").map(resolveUrl) : [],
  seller: {
    name:   row.seller_name   || null,
    phone:  row.seller_phone  || null,
    avatar: row.seller_avatar ? resolveUrl(row.seller_avatar) : null,
  },
});

// ── GET ALL (home feed — sirf active) ─────────────────────────────────────────
const getAllListings = async ({ category, search, filter, page, limit }) => {
  const pageNum  = Number(page)  || 1;
  const limitNum = Number(limit) || 10;
  const offset   = (pageNum - 1) * limitNum;
  let conditions = ["l.status = 'active'"], values = [];

  if (category) { conditions.push("l.category_slug = ?"); values.push(category); }
  if (search)   { conditions.push("(l.title LIKE ? OR l.description LIKE ?)"); values.push(`%${search}%`, `%${search}%`); }
  if (filter === "recent") conditions.push("l.created_at >= DATE_SUB(NOW(), INTERVAL 10 DAY)");

  const [rows] = await db.query(
    `SELECT l.*, GROUP_CONCAT(li.image_url) AS images,
       u.name AS seller_name, u.phone AS seller_phone, u.image AS seller_avatar
     FROM listings l
     LEFT JOIN listing_images li ON li.listing_id = l.id
     LEFT JOIN users u ON u.id = l.user_id
     WHERE ${conditions.join(" AND ")}
     GROUP BY l.id ORDER BY l.created_at DESC LIMIT ? OFFSET ?`,
    [...values, limitNum, offset]
  );
  return { rows: rows.map(formatListing), page: pageNum, count: rows.length };
};

// ── GET SINGLE ────────────────────────────────────────────────────────────────
const getListingById = async (id) => {
  const [rows] = await db.query(
    `SELECT l.*, GROUP_CONCAT(li.image_url) AS images,
       u.name AS seller_name, u.phone AS seller_phone, u.image AS seller_avatar
     FROM listings l
     LEFT JOIN listing_images li ON li.listing_id = l.id
     LEFT JOIN users u ON u.id = l.user_id
     WHERE l.id = ? GROUP BY l.id`,
    [id]
  );
  if (!rows.length) return null;
  return formatListing(rows[0]);
};

// ── GET MY LISTINGS — backend computed status ─────────────────────────────────
// sold    → status = 'sold'
// expired → status = 'active' AND posted > 30 days ago
// pending → status = 'active' AND posted <= 30 days ago
const getMyListings = async (userId) => {
  const [rows] = await db.query(
    `SELECT
       l.*,
       li.image_url AS image,
       DATEDIFF(NOW(), l.created_at) AS days_listed,
      CASE
  WHEN l.status = 'sold'                                THEN 'sold'
  WHEN l.status = 'paused'                              THEN 'paused'  -- ← ADD
  WHEN l.created_at < DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 'expired'
  ELSE 'pending'
END AS computed_status
     FROM listings l
     LEFT JOIN listing_images li ON li.id = (
       SELECT id FROM listing_images
       WHERE listing_id = l.id ORDER BY id ASC LIMIT 1
     )
     WHERE l.user_id = ?
     ORDER BY l.created_at DESC`,
    [userId]
  );

  return rows.map((row) => ({
    ...row,
    image:  row.image ? resolveUrl(row.image) : null,
    status: row.computed_status,
    daysListed:
      row.days_listed === 0 ? "Today"
      : row.days_listed === 1 ? "1 day ago"
      : `${row.days_listed} days ago`,
  }));
};

// ── MARK AS SOLD ──────────────────────────────────────────────────────────────
const markListingAsSold = async (listingId, userId) => {
  const [result] = await db.query(
    "UPDATE listings SET status='sold' WHERE id=? AND user_id=?",
    [listingId, userId]
  );
  return result.affectedRows > 0;
};

// ── CREATE ────────────────────────────────────────────────────────────────────
const createListing = async ({ userId, title, price, description, condition, location, category_slug, files }) => {
  const [result] = await db.query(
    `INSERT INTO listings (user_id,title,price,description,\`condition\`,location,category_slug,status)
     VALUES (?,?,?,?,?,?,?,'active')`,
    [userId, title, price, description, condition, location, category_slug]
  );
  const listingId = result.insertId;

  if (files?.length) {
    const uploads = await Promise.all(files.map((f) => uploadToCloudinary(f.buffer, "listings")));
    const vals = uploads.map((r) => [listingId, r.secure_url]);
    await db.query("INSERT INTO listing_images (listing_id, image_url) VALUES ?", [vals]);
  }

  return listingId;
};

module.exports = { getAllListings, getListingById, getMyListings, markListingAsSold, createListing };