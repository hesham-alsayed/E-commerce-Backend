// lib/redisClient.js
import { createClient } from "redis";

// لو عندك REDIS_URL في .env استخدمه، وإلا استخدم localhost
const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://127.0.0.1:6379",
});

redisClient.on("error", (err) => {
  console.error("Redis Client Error", err);
});

redisClient.on("connect", () => {
  console.log("Redis client connected");
});

redisClient.on("ready", () => {
  console.log("Redis client ready to use");
});

(async () => {
  try {
    await redisClient.connect();
    console.log("Redis connected successfully");
  } catch (err) {
    console.error("Redis connection failed:", err);
  }
})();

export default redisClient;
