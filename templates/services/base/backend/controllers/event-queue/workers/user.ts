import { Worker, Job } from "bullmq";
import { Redis, Cluster as RedisCluster } from "ioredis";

/**
 * User Worker
 *
 * Note: User creation/authentication is handled by Better Auth.
 * This worker handles async user-related tasks like sending welcome emails,
 * syncing with external services, etc.
 */
export const createUserWorker = (
  connection: Redis | RedisCluster,
  options: {
    concurrency?: number;
    autorun?: boolean;
  }
) => {
  return new Worker(
    "user",
    async (job: Job) => {
      switch (job.name) {
        case "send_welcome_email":
          // TODO: Implement welcome email sending
          console.log(`Sending welcome email to user: ${job.data.userId}`);
          break;
        case "sync_user_profile":
          // TODO: Sync user profile with external services
          console.log(`Syncing profile for user: ${job.data.userId}`);
          break;
        default:
          console.log(`Unknown job: ${job.name}`);
      }
    },
    {
      connection,
      ...options,
    }
  );
};
