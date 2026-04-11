# Store Best Practices

Guidelines for Zustand state management in the mobile app.

## Store Structure Pattern

Each store follows a consistent pattern:

```typescript
import { create } from 'zustand';

interface ExampleState {
  // State
  data: Data | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setData: (data: Data | null) => void;
  fetchData: () => Promise<void>;
  clearError: () => void;

  // Computed (using getter)
  get hasData(): boolean;
}

export const useExampleStore = create<ExampleState>((set, get) => ({
  // Initial state
  data: null,
  isLoading: false,
  error: null,

  // Setters
  setData: (data) => set({ data, error: null }),
  clearError: () => set({ error: null }),

  // Async action
  fetchData: async () => {
    try {
      set({ isLoading: true, error: null });
      const data = await fetchFromApi();
      set({ data });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed" });
    } finally {
      set({ isLoading: false });
    }
  },

  // Computed value
  get hasData() {
    return get().data !== null;
  },
}));
```

## Selector Hook Pattern

Create focused selector hooks to prevent unnecessary re-renders:

### State Selector (`useXxx`)

Returns read-only state:

```typescript
export const useExample = () => {
  const state = useExampleStore();
  return {
    data: state.data,
    isLoading: state.isLoading,
    error: state.error,
    hasData: state.hasData,
  };
};
```

### Actions Selector (`useXxxActions`)

Returns only actions:

```typescript
export const useExampleActions = () => {
  const state = useExampleStore();
  return {
    setData: state.setData,
    fetchData: state.fetchData,
    clearError: state.clearError,
  };
};
```

## State vs Actions Separation

### Why Separate?

Components using only actions won't re-render on state changes:

```typescript
// Re-renders when session/loading/error change
function SessionInfo() {
  const { session, isLoading } = useSession();
  return <Text>{session?.deviceId}</Text>;
}

// Never re-renders from store changes
function RefreshButton() {
  const { refreshSession } = useSessionActions();
  return <Button onPress={refreshSession} title="Refresh" />;
}
```

### When to Use Which

```typescript
// Need to read data → use state selector
const { session, isLoading } = useSession();

// Need to trigger action → use actions selector
const { initializeSession } = useSessionActions();

// Need both (rare) → import both
const { session } = useSession();
const { deleteSession } = useSessionActions();
```

## Async Storage Integration

For persisted state, use Zustand's persist middleware:

```typescript
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const usePersistedStore = create(
  persist<PersistedState>(
    (set) => ({
      preference: 'default',
      setPreference: (pref) => set({ preference: pref }),
    }),
    {
      name: 'user-preferences',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

## Best Practices

### 1. One Domain Per Store

```typescript
// Good - focused stores
ui-store.ts         // UI concerns
session-store.ts    // Session management
auth-store.ts       // Authentication

// Bad - everything in one store
app-store.ts        // UI + session + auth + ...
```

### 2. Keep State Flat

```typescript
// Good - flat state
interface SessionState {
  session: Session | null;
  sessionToken: string | null;
  isLoading: boolean;
}

// Bad - nested state
interface State {
  session: {
    data: {
      current: Session | null;
      token: string | null;
    };
    meta: {
      isLoading: boolean;
    };
  };
}
```

### 3. Handle Loading/Error for Async

Every async action should manage loading and error state:

```typescript
fetchData: async () => {
  try {
    set({ isLoading: true, error: null });
    const data = await api.fetch();
    set({ data });
  } catch (error) {
    set({ error: error.message });
  } finally {
    set({ isLoading: false });
  }
},
```

### 4. Use TypeScript

Define explicit interfaces for store state:

```typescript
interface SessionState {
  session: DeviceSession | null;
  sessionToken: string | null;
  deviceId: string | null;
  isLoading: boolean;
  isSessionChecked: boolean;
  error: string | null;

  // Actions with explicit signatures
  initializeSession: () => Promise<void>;
  deleteSession: () => Promise<void>;
}
```

### 5. Log State Changes (Debug)

Use logger for debugging state transitions:

```typescript
initializeSession: async () => {
  logger.debug('SessionStore: Initializing...');
  // ...
  logger.info('SessionStore: Initialized', { sessionId: session.id });
},
```
