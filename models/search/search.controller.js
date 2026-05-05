const {
  getHistory,
  saveQuery,
  deleteQuery,
  clearHistory,
  searchListings,
  getSuggestions,
} = require("./search.service");

const getSearchHistory = async (req, res) => {
  try {
    const history = await getHistory(req.user.userId);
    res.json({ success: true, data: history });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const saveSearchQuery = async (req, res) => {
  try {
    const { query } = req.body;
    if (!query?.trim()) {
      return res.status(400).json({ success: false, message: "Query is required" });
    }

    await saveQuery(req.user.userId, query);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const deleteSearchQuery = async (req, res) => {
  try {
    await deleteQuery(req.user.userId, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const clearSearchHistory = async (req, res) => {
  try {
    await clearHistory(req.user.userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const search = async (req, res) => {
  try {
    const data = await searchListings(req.query);
    res.json({ success: true, ...data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const suggestions = async (req, res) => {
  try {
    const data = await getSuggestions(req.user.userId, req.query.q || req.query.query);
    res.json({ success: true, suggestions: data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getSearchHistory,
  saveSearchQuery,
  deleteSearchQuery,
  clearSearchHistory,
  search,
  suggestions,
};
