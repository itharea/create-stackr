import fp from "fastify-plugin";
import { FastifyPluginAsync } from "fastify";
import { Static, Type } from "@sinclair/typebox";
import Ajv from "ajv";

import dotenv from "dotenv";
dotenv.config();

export enum NodeEnv {
  development = "development",
  test = "test",
  production = "production",
}

const ConfigSchema = Type.Object({
  NODE_ENV: Type.Optional(Type.Enum(NodeEnv)),
  LOG_LEVEL: Type.Optional(Type.String()),
  API_HOST: Type.Optional(Type.String()),
  API_PORT: Type.Optional(Type.String()),
  DATABASE_URL: Type.String(),
  JWT_SECRET: Type.Optional(Type.String()),
});

const ajv = new Ajv({
  allErrors: true,
  removeAdditional: true,
  useDefaults: true,
  coerceTypes: true,
});

export type Config = Static<typeof ConfigSchema>;

const configPlugin: FastifyPluginAsync = async (server) => {
  // Set defaults for optional fields
  const configWithDefaults = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    API_HOST: process.env.API_HOST || '0.0.0.0',
    API_PORT: process.env.API_PORT || '8080',
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET || 'your-jwt-secret-here-change-in-production',
    ...process.env,
  };

  const validate = ajv.compile(ConfigSchema);
  const valid = validate(configWithDefaults);
  
  if (!valid) {
    throw new Error(
      ".env file validation failed - " +
        JSON.stringify(validate.errors, null, 2)
    );
  }
  
  server.decorate("config", configWithDefaults as Config);
};

declare module "fastify" {
  interface FastifyInstance {
    config: Config;
  }
}

export default fp(configPlugin);