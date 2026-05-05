// modules/categories/category.routes.js

const express = require("express");
const router  = express.Router();
const { getCategories } = require("./category.controller");

router.get("/", getCategories); // GET /categories

module.exports = router;