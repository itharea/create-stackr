# Context - Best Practices

## When to Use React Context

Use Context for **UI-level state that many components read but rarely changes**. Currently: theming.

For frequently-changing state or state with actions, use **Zustand stores** instead.

## Theme Context

Provides theme colors and mode switching throughout the app.

### Two Hooks

| Hook | Returns | Throws if no Provider | Use Case |
|------|---------|----------------------|----------|
| `useTheme()` | `{ theme, mode, setMode, toggleMode, isSystemDefault, setSystemDefault }` | Yes | Settings screens, theme toggles |
| `useAppTheme()` | `AppTheme` (colors/spacing only) | No (falls back to light) | Components that just need colors |

**Use `useAppTheme()` in components** - it's simpler and safe outside providers.
**Use `useTheme()` in settings** - when you need mode control.

### Theme in Components

```typescript
import { useAppTheme } from "@/context/theme-context";

function MyComponent() {
  const theme = useAppTheme();
  // theme.colors.background, theme.colors.text, etc.
}
```

### Theme Persistence

- Stored in AsyncStorage under `@app_theme_mode`
- Shape: `{ mode: "light" | "dark", useSystem: boolean }`
- On launch: loads preference, falls back to system, then light

## Adding a New Context

Prefer Zustand stores. Only use Context when:
- The state is purely UI-related (not data/business logic)
- A Provider wrapper is natural (theming, localization)
- You need React tree scoping (different themes per subtree)

If you do add one:
1. Create `{name}-context.tsx` in this folder
2. Export both a Provider component and a `useXxx()` hook
3. Throw in hook if Provider missing (fail-fast)
4. Memoize context value to prevent unnecessary re-renders
