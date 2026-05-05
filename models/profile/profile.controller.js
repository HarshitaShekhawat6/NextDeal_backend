// modules/profile/profile.controller.js

const { getProfile, updateProfile, deleteProfile } = require("./profile.service");

const getMyProfile = async (req, res) => {
  try {
    const profile = await getProfile(req.user.userId);
    if (!profile)
      return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, data: profile });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// multer uploadSingle middleware runs before this
// req.file  = uploaded image (camera/gallery)
// req.body  = all text fields including imageUrl (from URL picker)
const updateMyProfile = async (req, res) => {
  try {
    const imagePath = await updateProfile(req.user.userId, req.body, req.file || null);
    if (imagePath === null)
      return res.status(404).json({ success: false, message: "User not found" });

    res.json({ success: true, message: "Profile updated successfully", image: imagePath });
  } catch (err) {
    console.error("[profile] update error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

const deleteMyProfile = async (req, res) => {
  try {
    await deleteProfile(req.user.userId);
    res.json({ success: true, message: "Account permanently deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getMyProfile, updateMyProfile, deleteMyProfile };