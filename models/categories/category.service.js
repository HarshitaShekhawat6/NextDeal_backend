// modules/categories/category.service.js

const db = require("../../config/db");

const getAllCategories = async () => {
  const [rows] = await db.query(
    "SELECT id, name, slug, icon_name FROM categories"
  );
  return rows;
};

module.exports = { getAllCategories };