// modules/categories/category.controller.js

const { getAllCategories } = require("./category.service");

const getCategories = async (req, res) => {
  try {
    const categories = await getAllCategories();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getCategories };