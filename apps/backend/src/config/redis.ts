import Redis from "ioredis";

console.log(
  "REDIS_URL configured:",
  Boolean(process.env.REDIS_URL),
  "host:",
  process.env.REDIS_URL
    ? new URL(process.env.REDIS_URL).hostname
    : "MISSING",
);

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

export const redisClient = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
});

redisClient.on("connect", () => {
  console.log("Redis connected successfully");
});

redisClient.on("error", (err) => {
  console.error("Redis connection error:", err);
});