const dotenv = require("dotenv");
dotenv.config({ path: `${__dirname}/config/config.env` });

const { connectDatabase } = require("./config/db");
const app = require("./app");

// ----- Handle uncaught exceptions -----
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION! 💥 Shutting down...");
  console.error(err.name, err.message);
  process.exit(1);
});

const PORT =  process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDatabase();
    // ----- Store server instance for unhandledRejection -----
    const server = app.listen(PORT, () => {
      console.log(`Server running on : http://localhost:${PORT}`);
    });

    // ----- Handle unhandled promise rejections -----
    process.on("unhandledRejection", (err) => {
      console.error("UNHANDLED REJECTION! 💥 Shutting down...");
      console.error(err.name, err.message);
      server.close(() => {
        process.exit(1);
      });
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
