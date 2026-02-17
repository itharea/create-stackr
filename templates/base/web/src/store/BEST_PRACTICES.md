# Store Best Practices

Guidelines for Zustand state management in the web application.

## When to Use Zustand

Zustand stores are for **client-side global state** that needs to persist across navigation and be reactive:
- Device session tracking
- UI state (modals, toasts, sidebar)
- Client-side caches that don't map to a server resource

For server data and mutations, prefer **server actions with `revalidatePath`/`revalidateTag`**, `useActionState`, and `useFormStatus` instead.

## Store Structure Pattern

```tsx
"use client";

import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

interface ExampleState {
  // State
  data: Data | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  setData: (data: Data | null) => void;
  clearError: () => void;
}

export const useExampleStore = create<ExampleState>((set, get) => ({
  data: null,
  isLoading: true,
  isInitialized: false,
  error: null,

  initialize: async () => {
    if (get().isInitialized) return;
    try {
      set({ isLoading: true, error: null });
      const data = await fetchFromApi();
      set({ data });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed" });
    } finally {
      set({ isLoading: false, isInitialized: true });
    }
  },

  setData: (data) => set({ data, error: null }),
  clearError: () => set({ error: null }),
}));
```

## Selector Hooks Pattern

Create focused selector hooks to prevent unnecessary re-renders:

```tsx
// Selector Hooks (using useShallow for React 19 compatibility)

export const useExample = () =>
  useExampleStore(
    useShallow((s) => ({
      data: s.data,
      isLoading: s.isLoading,
      error: s.error,
    }))
  );

export const useExampleActions = () =>
  useExampleStore(
    useShallow((s) => ({
      initialize: s.initialize,
      clearError: s.clearError,
    }))
  );
```

## Why Separate State and Actions?

Components using only actions won't re-render on state changes:

```tsx
// Re-renders when data changes
function DataDisplay() {
  const { data, isLoading } = useExample();
  return <div>{isLoading ? "Loading..." : data}</div>;
}

// Never re-renders from store changes
function RefreshButton() {
  const { initialize } = useExampleActions();
  return <button onClick={initialize}>Refresh</button>;
}
```

## React 19 Compatibility

### Use `useShallow`

Required for stable object references with React 19:

```tsx
import { useShallow } from "zustand/react/shallow";

// Correct - useShallow creates stable reference
export const useDeviceSession = () =>
  useDeviceSessionStore(
    useShallow((s) => ({
      deviceSession: s.deviceSession,
      isLoading: s.isLoading,
    }))
  );
```

## Guidelines

1. **One domain per store** - Device session, UI, etc.
2. **Keep state flat** - Avoid deep nesting
3. **Handle loading/error** - Every async action needs these
4. **Selector hooks** - Create `useXxx` and `useXxxActions` pairs
5. **Use `useShallow`** - Required for React 19 compatibility
6. **Guard initialization** - Use `isInitialized` to prevent duplicate calls
