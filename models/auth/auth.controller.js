// modules/auth/auth.controller.js

const jwt  = require("jsonwebtoken");
const { findUserByPhone, createUser } = require("./auth.service");

const JWT_SECRET = process.env.JWT_SECRET || "nextdeal_secret_key";
// ✅ .env mein JWT_SECRET likha hai to wahi use hoga — yahan hardcode backup sirf dev ke liye hai

// ── REGISTER ──────────────────────────────────────────────────────────────────
const registerUser = async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ message: "Phone required" });

  try {
    const existing = await findUserByPhone(phone);
    if (existing) return res.status(409).json({ message: "Already registered" });

    await createUser(phone);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ message: "DB error: " + err.message });
  }
};

// ── LOGIN ─────────────────────────────────────────────────────────────────────
const loginUser = async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ message: "Phone required" });

  try {
    const user = await findUserByPhone(phone);
    if (!user) return res.status(404).json({ message: "Not registered" });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ message: "DB error: " + err.message });
  }
};

// ── VERIFY OTP ────────────────────────────────────────────────────────────────
const verifyOtp = async (req, res) => {
  const { phone, otp } = req.body;
  if (!phone || !otp)
    return res.status(400).json({ message: "Phone and OTP required" });

  if (otp !== "123456")
    return res.status(400).json({ message: "Invalid OTP" });

  try {
    const user = await findUserByPhone(phone);
    if (!user) return res.status(404).json({ message: "User not found" });

    const token = jwt.sign(
      { userId: user.id, phone },
      JWT_SECRET,
      { expiresIn: "30d" }
    );

    return res.json({
      success: true,
      token,
      user: {
        id:    user.id,
        phone: user.phone,
        name:  user.name || "",
      },
    });
  } catch (err) {
    return res.status(500).json({ message: "DB error: " + err.message });
  }
};

module.exports = { registerUser, loginUser, verifyOtp };