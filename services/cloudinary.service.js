// services/cloudinary.service.js

const cloudinary = require("../config/cloudinary");

// ── Upload single file buffer to Cloudinary ───────────────────────────────────
// folder: "profiles" | "listings"
const uploadToCloudinary = (fileBuffer, folder) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        transformation: [{ quality: "auto", fetch_format: "auto" }],
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    stream.end(fileBuffer);
  });
};

// ── Delete image from Cloudinary by URL ───────────────────────────────────────
// Pass the full cloudinary URL — public_id extract karke delete karta hai
const deleteFromCloudinary = async (imageUrl) => {
  if (!imageUrl || !imageUrl.includes("cloudinary")) return;

  try {
    // URL se public_id extract karo
    // e.g. https://res.cloudinary.com/demo/image/upload/v123/profiles/abc.jpg
    //   → public_id = "profiles/abc"
    const parts   = imageUrl.split("/");
    const upload  = parts.indexOf("upload");
    const publicId = parts
      .slice(upload + 2)           // version skip karo
      .join("/")
      .replace(/\.[^.]+$/, "");   // extension hatao

    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.log("[Cloudinary] Delete error:", err.message);
  }
};

module.exports = { uploadToCloudinary, deleteFromCloudinary };