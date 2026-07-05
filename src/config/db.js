const mongoose = require("mongoose");

exports.connectDatabase = async () => {
  try {
    const db_url = process.env.DB_URL 
      // process.env.NODE_ENV === "production"
      //   ? process.env.DB_URL
      //   : process.env.DB_LOCAL_URL;

    const conn = await mongoose.connect(db_url);

    console.log(
      `MongoDB Connected Successfully ✅`,
    );
  } catch (error) { 

    console.error("Database connection failed ❌:", error);
    process.exit(1);
  }
};




