// modules/users/user.routes.js

const express = require("express");
const router  = express.Router();
const { uploadProfileImage, getUsers, getUser, updateUser, deleteUser } = require("./user.controller");

// GET all users
router.get("/",    getUsers);

// GET user by id
router.get("/:id", getUser);

// UPDATE user — multer pehle, phir controller
router.put("/:id", uploadProfileImage, updateUser);

// DELETE user
router.delete("/:id", deleteUser);

module.exports = router;