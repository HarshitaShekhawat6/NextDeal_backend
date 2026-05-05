// modules/wishlist/wishlist.routes.js

const express = require("express");
const router  = express.Router();
const auth    = require("../auth/auth.middleware");
const {
  getWishlist, addWishlist, removeWishlist, checkWishlist,
} = require("./wishlist.controller");

// All wishlist routes require auth
router.use(auth);

router.get("/",                   getWishlist);    // GET    /wishlist
router.get("/check/:listingId",   checkWishlist);  // GET    /wishlist/check/:id
router.post("/:listingId",        addWishlist);    // POST   /wishlist/:id
router.delete("/:listingId",      removeWishlist); // DELETE /wishlist/:id

module.exports = router;