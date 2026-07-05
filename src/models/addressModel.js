const mongoose = require("mongoose");
const addressSchema = new mongoose.Schema({
  country: String,
  firstName: String,
  lastName: String,
  address: String,
  city: String,
  postalCode: String,
  phone: String,
});

module.exports = addressSchema;
