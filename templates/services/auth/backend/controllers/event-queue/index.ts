import dotenv from "dotenv";
dotenv.config({ path: ".env" });

import { Redis } from "ioredis";
import { createUserWorker } from "./workers/user";

const redisConnection = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD || "",
  maxRetriesPerRequest: null,
});

// Create a account worker
const userWorker = createUserWorker(redisConnection, {
  concurrency: 20,
  autorun: true,
});

console.log("User worker started");
