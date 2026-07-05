const dotenv = require("dotenv");
dotenv.config();

const mongoose = require("mongoose");
const Product = require("./src/models/productModel");
const products = require("./src/data/products.json");

const connectDatabase = async () => {
  try {
    const db_url =
      "mongodb+srv://heshamelsauied_db_user:E1IQehfJtlQKJLf2@cluster0.vsx2ll7.mongodb.net/?appName=Cluster0";
    await mongoose.connect(db_url);

    console.log("MongoDB Connected Successfully ✅");
  } catch (error) {
    console.error("Database connection failed ❌:", error);
    process.exit(1);
  }
};

// ✅ import data
const importData = async () => {
  try {
    await Product.insertMany(products);
    console.log("Data Imported ✅");
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

// ❌ delete data
const deleteData = async () => {
  try {
    await Product.deleteMany();
    console.log("Data Deleted ❌");
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

const run = async () => {
  await connectDatabase();

  if (process.argv[2] === "--import") {
    await importData();
  } else if (process.argv[2] === "--delete") {
    await deleteData();
  }
};

run();
