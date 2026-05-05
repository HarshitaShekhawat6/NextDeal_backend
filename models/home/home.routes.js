// backend/models/home/home.routes.js

const express = require("express");
const router = express.Router();
const auth = require("../auth/auth.middleware");
const { getHome } = require("./home.controller");

router.get("/", auth, getHome);

module.exports = router;
