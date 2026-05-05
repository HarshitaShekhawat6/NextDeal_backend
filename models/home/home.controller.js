// backend/models/home/home.controller.js

const { getHomeContent } = require("./home.service");

const getHome = async (req, res) => {
  try {
    const data = await getHomeContent(req.user);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getHome };
