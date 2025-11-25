# Test Mocking Guide

This guide explains how to properly mock dependencies in Vitest tests.

## Important: vi.mock() Must Be at Top Level

Vitest requires `vi.mock()` calls to be at the **top level** of test files, before any `describe()` or `it()` blocks.

## Common Mock Patterns

### Mocking execa (Shell Commands)

```typescript
import { vi } from 'vitest';
import { mockExecaSuccess } from '../utils/mock-factories.js';

// At top level of test file (before describe blocks)
vi.mock('execa', () => ({
  execa: vi.fn().mockResolvedValue(mockExecaSuccess()),
}));

describe('My Test Suite', () => {
  // ... tests
});
```

### Mocking inquirer (Prompts)

```typescript
import { vi } from 'vitest';

// At top level
vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn().mockResolvedValue({ projectName: 'test-app' }),
  },
}));
```

### Mocking File System (fs-extra)

```typescript
import { vi } from 'vitest';

// At top level
vi.mock('fs-extra', () => ({
  default: {
    pathExists: vi.fn().mockResolvedValue(true),
    ensureDir: vi.fn().mockResolvedValue(undefined),
    readJSON: vi.fn().mockResolvedValue({ name: 'test' }),
    writeJSON: vi.fn().mockResolvedValue(undefined),
  },
}));
```

### Resetting Mocks Between Tests

```typescript
import { beforeEach, vi } from 'vitest';

beforeEach(() => {
  vi.clearAllMocks(); // Clear mock call history
});
```

## Factory Functions

Use factory functions from `mock-factories.ts` to create consistent mock data:

```typescript
import { mockExecaSuccess, mockExecaFailure } from '../utils/mock-factories.js';

// Success case
vi.mock('execa', () => ({
  execa: vi.fn().mockResolvedValue(mockExecaSuccess()),
}));

// Failure case
vi.mock('execa', () => ({
  execa: vi.fn().mockRejectedValue(mockExecaFailure('Command failed')),
}));
```

## Why Not setupFiles?

Vitest's `setupFiles` runs **after** module evaluation, so it's too late to define mocks.
Always use `vi.mock()` at the top level of each test file.
