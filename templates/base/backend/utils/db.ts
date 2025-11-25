import { PrismaClient } from "@prisma/client";

let db: PrismaClient;

declare global {
  var __db: PrismaClient | undefined;
}

// Use global instance in development to prevent exhausting database connections during hot reloads
if (process.env.NODE_ENV === "production") {
  db = new PrismaClient({
    log: [{ emit: "event", level: "query" }],
  });
} else {
  if (!global.__db) {
    global.__db = new PrismaClient({
      log: [{ emit: "event", level: "query" }],
    });
  }
  db = global.__db;
}

// Connect to database
db.$connect()
  .then(() => console.log("✅ Database connected successfully"))
  .catch((err: any) => {
    console.error("❌ Database connection failed:", err);
    process.exit(1);
  });

// Gracefully disconnect on process termination
process.on('SIGINT', async () => {
  await db.$disconnect();
  console.log('Database connection closed.');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await db.$disconnect();
  console.log('Database connection closed.');
  process.exit(0);
});

export { db };