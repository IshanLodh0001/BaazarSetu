import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL;

console.log(
  "REDIS_URL:",
  redisUrl
    ? `configured (${new URL(redisUrl).hostname})`
    : "MISSING",
);

if (!redisUrl) {
  throw new Error("REDIS_URL is not configured");
}

export const redisClient = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
});

redisClient.on("connect", () => {
  console.log("Redis connected successfully");
});

redisClient.on("error", (err) => {
  console.error("Redis connection error:", err);
});