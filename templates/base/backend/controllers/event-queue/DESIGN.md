# Event Queue Controller - Design

## Overview

The event queue controller runs as a **separate process** from the REST API. It processes background jobs using BullMQ workers backed by Redis.

## Architecture

```
Redis Queue <-> Worker Process (this controller)
     ^
REST API (enqueues jobs via BullMQ Queue class)
```

The REST API enqueues jobs; this process consumes them. They share Redis but run independently.

## Structure

```
event-queue/
├── index.ts           # Bootstrap: Redis connection, worker creation
└── workers/
    └── user.ts        # User-related background jobs
```

## Worker Pattern

Each worker handles a named queue and dispatches by job name:

```typescript
export const createMyWorker = (
  connection: Redis | RedisCluster,
  options: { concurrency?: number; autorun?: boolean }
) => {
  return new Worker(
    "queue-name",
    async (job: Job) => {
      switch (job.name) {
        case "job_type":
          // Handle job
          break;
      }
    },
    { connection, ...options }
  );
};
```

## Enqueueing Jobs (from REST API)

```typescript
import { Queue } from "bullmq";

const userQueue = new Queue("user", { connection: redisConnection });
await userQueue.add("send_welcome_email", { userId: "123" });
```

## Current Workers

| Worker | Queue | Jobs | Concurrency |
|--------|-------|------|-------------|
| `user` | `"user"` | `send_welcome_email`, `sync_user_profile` | 20 |

## Adding a New Worker

1. Create `workers/{name}.ts` following the `createXxxWorker` pattern
2. Import and initialize in `index.ts` with Redis connection
3. Create a corresponding `Queue` in the REST API domain service to enqueue jobs

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Separate process | Workers don't block API responses |
| BullMQ over custom | Battle-tested, supports retries/priorities/scheduling |
| Switch-based dispatch | Simple, explicit job routing per worker |
| High concurrency (20) | Background tasks are typically I/O-bound |
