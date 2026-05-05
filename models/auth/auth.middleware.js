// modules/auth/auth.middleware.js

const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "nextdeal_secret_key";

const auth = (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer "))
    return res.status(401).json({ success: false, message: "No token provided" });

  try {
    req.user = jwt.verify(header.split(" ")[1], JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};

module.exports = auth;