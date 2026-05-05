// modules/users/user.validation.js

const validateUpdateUser = (body) => {
  const { phone, email } = body;

  if (phone && !/^\d{10}$/.test(phone)) {
    return "Phone must be 10 digits";
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Invalid email format";
  }

  return null; // null = valid
};

module.exports = { validateUpdateUser };