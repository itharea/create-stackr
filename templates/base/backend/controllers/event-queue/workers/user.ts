import { Worker, Job } from "bullmq";
import { Redis, Cluster as RedisCluster } from "ioredis";
import { createUser } from "@/domain/user/repository";

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
      if (job.name === "create_user") {
        await createUser(job.data.email, job.data.password, job.data.name);
      }
    },
    {
      connection,
      ...options,
    }
  );
};
