// modules/listings/listing.routes.js

const express = require("express");
const router  = express.Router();
const auth    = require("../auth/auth.middleware");
const {
  uploadListingImages,
  getAll, getOne, getMy, markAsSold, create,
} = require("./listing.controller");

// Public
router.get("/",    getAll);   // GET all listings (home feed)
router.get("/:id", getOne);   // GET single listing

// Protected
router.get( "/my/listings",   auth,                          getMy);       // My listings
router.post("/",              auth, uploadListingImages,      create);      // Create listing
router.patch("/:id/sold",     auth,                          markAsSold);  // Mark as sold

module.exports = router;