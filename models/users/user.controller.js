// modules/users/user.controller.js

const multer  = require("multer");
const path    = require("path");
const fs      = require("fs");
const { getAllUsers, getUserById, updateUserById, deleteUserById } = require("./user.service");
const { validateUpdateUser } = require("./user.validation");

// ── Multer setup ──────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/profiles";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `user_${req.params.id}_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only images allowed"));
  },
});

const uploadProfileImage = upload.single("image");

// ── GET ALL USERS ─────────────────────────────────────────────────────────────
const getUsers = async (req, res) => {
  try {
    const users = await getAllUsers();
    return res.json(users);
  } catch (err) {
    return res.status(500).json({ message: "DB Error" });
  }
};

// ── GET USER BY ID ────────────────────────────────────────────────────────────
const getUser = async (req, res) => {
  try {
    const user = await getUserById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json(user);
  } catch (err) {
    return res.status(500).json({ message: "DB Error" });
  }
};

// ── UPDATE USER ───────────────────────────────────────────────────────────────
const updateUser = async (req, res) => {
  const error = validateUpdateUser(req.body);
  if (error) return res.status(400).json({ message: error });

  try {
    const imagePath = await updateUserById(req.params.id, req.body, req.file);
    if (imagePath === null) return res.status(404).json({ message: "User not found" });

    return res.json({
      success: true,
      message: "Profile updated successfully",
      image:   imagePath,
    });
  } catch (err) {
    return res.status(500).json({ message: "DB Error: " + err.message });
  }
};

// ── DELETE USER ───────────────────────────────────────────────────────────────
const deleteUser = async (req, res) => {
  try {
    await deleteUserById(req.params.id);
    return res.json({ success: true, message: "Account deleted successfully" });
  } catch (err) {
    return res.status(500).json({ message: "DB Error: " + err.message });
  }
};

module.exports = { uploadProfileImage, getUsers, getUser, updateUser, deleteUser };