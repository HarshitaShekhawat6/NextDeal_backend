// modules/listings/listing.validation.js

const validateCreateListing = (body) => {
  const { title, price, category_slug } = body;

  if (!title?.trim())         return "Title is required";
  if (!price)                 return "Price is required";
  if (isNaN(Number(price)))   return "Price must be a number";
  if (!category_slug?.trim()) return "Category is required";

  return null;
};

module.exports = { validateCreateListing };