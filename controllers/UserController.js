const db      = require("../config/db");
const jwt     = require("jsonwebtoken");
const multer  = require("multer");
const path    = require("path");
const fs      = require("fs");

// ── Multer setup — profile images
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
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only images allowed"));
  },
});

// Export middleware for use in router
const uploadProfileImage = upload.single("image");

// ── REGISTER 
const register = (req, res) => {
  const { phone, name } = req.body;
  if (!phone) return res.status(400).json({ message: "Phone is required" });

  db.query("SELECT id FROM users WHERE phone = ?", [phone], (err, result) => {
    if (err) return res.status(500).json({ message: "DB Error" });
    if (result.length > 0)
      return res.status(400).json({ message: "User already exists" });

    db.query(
      "INSERT INTO users (phone, name) VALUES (?, ?)",
      [phone, name || null],
      (err2, result2) => {
        if (err2) return res.status(500).json({ message: "DB Error" });
        res.json({ success: true, userId: result2.insertId, phone });
      }
    );
  });
};

// ── LOGIN 
const login = (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ message: "Phone is required" });

  db.query("SELECT * FROM users WHERE phone = ?", [phone], (err, result) => {
    if (err) return res.status(500).json({ message: "DB Error" });
    if (result.length === 0)
      return res.status(404).json({ message: "User not found" });

    const user = result[0];
    res.json({ success: true, userId: user.id, phone: user.phone, is_verified: user.is_verified });
  });
};

// ── SEND OTP 
const sendOtp = (req, res) => {
  const { phone } = req.body;
  const otp      = "123456";
  const expires  = new Date(Date.now() + 5 * 60 * 1000);

  db.query(
    "UPDATE users SET otp = ?, otp_expires_at = ? WHERE phone = ?",
    [otp, expires, phone],
    (err, result) => {
      if (err) return res.status(500).json({ message: "DB Error" });
      if (result.affectedRows === 0)
        return res.status(404).json({ message: "Phone not registered" });

     
      res.json({ success: true, message: "OTP sent", otp });
    }
  );
};

// ── VERIFY OTP 
const verifyOtp = (req, res) => {
  const { phone, otp } = req.body;

  db.query("SELECT * FROM users WHERE phone = ?", [phone], (err, result) => {
    if (err) return res.status(500).json({ message: "DB Error" });
    if (result.length === 0)
      return res.status(404).json({ message: "User not found" });

    if (otp !== "123456")
      return res.status(400).json({ message: "Invalid OTP" });

    const user = result[0];

    db.query(
      "UPDATE users SET is_verified = 1, otp = NULL, otp_expires_at = NULL WHERE phone = ?",
      [phone],
      (err2) => {
        if (err2) return res.status(500).json({ message: "DB Error" });

        const token = jwt.sign(
          { userId: user.id, phone: user.phone },
          process.env.JWT_SECRET || "nextdeal_secret_key",
          { expiresIn: "7d" }
        );

        res.json({ success: true, token, userId: user.id, phone: user.phone });
      }
    );
  });
};

// ── GET ALL USERS 
const getUsers = async (req, res) => {
  try {
    const [result] = await db.query(
      "SELECT id, name, email, phone FROM users"
    );

    return res.json(result);

  } catch (err) {
    return res.status(500).json({ message: "DB Error" });
  }
};

// ── GET USER BY ID 
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      "SELECT id, name, email, phone, image, address1, address2, city, state, bio, latitude, longitude, created_at, modified_at FROM users WHERE id = ?",
      [id]
    );

    if (result.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json(result[0]);

  } catch (err) {
    return res.status(500).json({ message: "DB Error" });
  }
};

// ── UPDATE USER 
// Handles: name, email, phone, bio, address1, address2, city, state, image (file)
const updateUser = async (req, res) => {
  const { id } = req.params;
 

  const { name, email, phone, bio, address1, address2, city, state, latitude, longitude } = req.body;
  const imageFile  = req.file;
  const modifiedAt = new Date();

  try {
    // Get current image
    const [rows] = await db.query("SELECT image FROM users WHERE id = ?", [id]);
   

    if (!rows.length) 
      return res.status(404).json({ message: "User not found" });

    const oldImage = rows[0].image;

    // Handle image path
    let imagePath = oldImage;
    if (imageFile) {
      imagePath = `/uploads/profiles/${imageFile.filename}`;
      if (oldImage) {
        const oldPath = path.join(__dirname, "..", oldImage);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
    }

    const sql = `
      UPDATE users SET
        name        = COALESCE(?, name),
        email       = COALESCE(?, email),
        phone       = COALESCE(?, phone),
        bio         = ?,
        address1    = ?,
        address2    = ?,
        city        = ?,
        state       = ?,
        latitude    = COALESCE(?, latitude),
        longitude   = COALESCE(?, longitude),
        image       = ?,
        modified_at = ?
      WHERE id = ?
    `;

    const [result] = await db.query(sql, [
      name || null, email || null, phone || null,
      bio || null, address1 || null, address2 || null,
      city || null, state || null,
      latitude || null, longitude || null,
      imagePath, modifiedAt, id,
    ]);

   

    return res.json({ 
      success: true, 
      message: "Profile updated successfully", 
      image: imagePath 
    });

  } catch (err) {
    return res.status(500).json({ message: "DB Error: " + err.message });
  }
};

// ── DELETE USER 
const deleteUser = async (req, res) => {
  const { id } = req.params;
  try {
    // Wishlist delete
    await db.query("DELETE FROM wishlist WHERE user_id = ?", [id]);
    
    // User delete
    await db.query("DELETE FROM users WHERE id = ?", [id]);
    
    return res.json({ success: true, message: "Account deleted successfully" });
  } catch (err) {
    return res.status(500).json({ message: "DB Error: " + err.message });
  }
};

// ── FORGOT PASSWORD 
// const forgotPassword = (req, res) => {
//   const { email }    = req.params;
//   const { password } = req.body;

//   if (!email || !password)
//     return res.status(400).json({ message: "Email and password required" });

//   db.query("UPDATE users SET password = ? WHERE email = ?", [password, email], (err, result) => {
//     if (err) return res.status(500).json({ message: "DB Error" });
//     if (result.affectedRows === 0)
//       return res.status(404).json({ message: "User not found" });
//     res.json({ success: true, message: "Password updated successfully" });
//   });
// };

module.exports = {
  register, login, sendOtp, verifyOtp,
  getUsers, getUserById, updateUser, deleteUser, uploadProfileImage,
};
