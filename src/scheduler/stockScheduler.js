// scheduler/stockScheduler.js
const cron = require("node-cron");
const { checkStockAndNotify } = require("../controllers/productController");

cron.schedule("* * * * *", async () => {
  console.log("Running stock check every minute...");
  await checkStockAndNotify();
});
