# Routes - Best Practices

## Route Structure

Routes are thin handlers that delegate to the domain layer:

```typescript
import { FastifyPluginAsync } from "fastify";
import { CreateEntityBodySchema, CreateEntityResponseSchema } from "../../../domain/entity/schema";
import { createEntity } from "../../../domain/entity/service";

const entityRoutes: FastifyPluginAsync = async (server) => {
  server.post<{
    Body: typeof CreateEntityBodySchema._type;
    Reply: typeof CreateEntityResponseSchema._type;
  }>(
    "/",
    {
      schema: {
        body: CreateEntityBodySchema,
        response: { 201: CreateEntityResponseSchema },
      },
    },
    async (request, reply) => {
      const result = await createEntity(request.body);
      return reply.status(201).send(result);
    }
  );
};

export default entityRoutes;
```

## Schema Definitions

**Always import schemas from domain** - no inline definitions:

```typescript
// Correct
import { CreateEntityBodySchema, EntityResponseSchema } from "../../../domain/entity/schema";

server.post("/", {
  schema: {
    body: CreateEntityBodySchema,
    response: { 201: EntityResponseSchema },
  },
}, handler);

// Wrong - inline schema
server.post("/", {
  schema: {
    body: Type.Object({ name: Type.String() }),  // Don't do this
  },
}, handler);
```

## Domain Layer Usage

**All logic and DB access goes through domain layer** - routes only coordinate:

```typescript
// Correct - call domain service/repository
import { createEntity } from "../../../domain/entity/service";
import { deleteEntity } from "../../../domain/entity/repository";

server.post("/", async (request, reply) => {
  const result = await createEntity(request.body);
  return reply.status(201).send(result);
});

// Wrong - inline logic or DB call
server.post("/", async (request, reply) => {
  const token = crypto.randomUUID();  // Logic belongs in service
  const [row] = await db.insert(...);  // DB belongs in repository
});
```

## Authentication

Use middleware hooks for protected routes:

```typescript
// Requires authenticated user
server.get("/protected", {
  onRequest: server.requireAuth,
}, async (request, reply) => {
  const { user } = request as AuthFastifyRequest;
});

// Requires device session
server.get("/device", {
  onRequest: server.requireDeviceSession,
}, async (request, reply) => {
  const { sessionToken } = request as DeviceSessionFastifyRequest;
});
```

## Error Handling

**No try-catch in routes.** Errors propagate to the error handler plugin:

```typescript
// Correct - let errors propagate
server.post("/", async (request, reply) => {
  const result = await createEntity(request.body);
  return reply.status(201).send(result);
});
```

## Import Pattern

```typescript
// Schemas - always from domain
import { EntitySchema, CreateEntityBodySchema } from "../../../domain/entity/schema";

// Business logic - from service
import { createEntity, validateEntity } from "../../../domain/entity/service";

// Simple CRUD (when no service exists) - from repository
import { deleteEntity } from "../../../domain/entity/repository";
```
