// modules/profile/profile.routes.js

const express          = require("express");
const router           = express.Router();
const auth             = require("../auth/auth.middleware");
const { uploadSingle } = require("../../middleware/upload.middleware");
const { getMyProfile, updateMyProfile, deleteMyProfile } = require("./profile.controller");

router.use(auth);

router.get("/",    getMyProfile);
router.put("/",    uploadSingle, updateMyProfile);
router.delete("/", deleteMyProfile);

module.exports = router;