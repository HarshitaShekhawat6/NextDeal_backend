// modules/listings/listing.controller.js

const { uploadMultiple }        = require("../../middleware/upload.middleware");
const { validateCreateListing } = require("./listing.validation");
const {
  getAllListings, getListingById,
  getMyListings, markListingAsSold,
  createListing,
} = require("./listing.service");

const uploadListingImages = uploadMultiple;

const getAll = async (req, res) => {
  try {
    const result = await getAllListings(req.query);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getOne = async (req, res) => {
  try {
    const listing = await getListingById(req.params.id);
    if (!listing) return res.status(404).json({ success: false, message: "Listing not found" });
    res.json({ success: true, data: listing });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getMy = async (req, res) => {
  try {
    const listings = await getMyListings(req.user.userId);
    res.json(listings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── PATCH /listings/:id/sold ──────────────────────────────────────────────────
const markAsSold = async (req, res) => {
  try {
    const listingId = Number(req.params.id);
    const userId    = req.user.userId;

    const updated = await markListingAsSold(listingId, userId);
    if (!updated)
      return res.status(404).json({ success: false, message: "Listing not found or not yours" });

    res.json({ success: true, message: "Listing marked as sold" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const create = async (req, res) => {
  const error = validateCreateListing(req.body);
  if (error) return res.status(400).json({ success: false, message: error });

  try {
    const { title, price, description, condition, location, category_slug } = req.body;
    const userId = req.user?.userId ?? req.user?.id ?? null;

    const listingId = await createListing({
      userId, title, price, description, condition, location, category_slug,
      files: req.files,
    });

    res.json({ success: true, message: "Listing created successfully", listingId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { uploadListingImages, getAll, getOne, getMy, markAsSold, create };