const express = require("express");
const router = express.Router();
const auth = require("../auth/auth.middleware");

const {
  getSearchHistory,
  saveSearchQuery,
  deleteSearchQuery,
  clearSearchHistory,
  search,
  suggestions,
} = require("./search.controller");

router.use(auth);

router.get("/listings", search);
router.get("/suggestions", suggestions);

router.get("/history", getSearchHistory);
router.post("/history", saveSearchQuery);
router.delete("/history/:id", deleteSearchQuery);
router.delete("/history", clearSearchHistory);

module.exports = router;
