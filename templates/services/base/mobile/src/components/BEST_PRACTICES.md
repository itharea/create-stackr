# Components - Agent Instructions

## Before Creating a Component

1. Check if a similar component already exists in `ui/` or feature folders
2. Decide placement: `ui/` for generic primitives, `{feature}/` for feature-specific

## Template

Use this template for every new component:

```typescript
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useAppTheme, AppTheme } from '@/context/theme-context';

interface MyComponentProps {
  // Required props first
  title: string;
  // Optional props with defaults
  variant?: 'primary' | 'secondary';
  // Style override (always include)
  style?: ViewStyle;
}

export const MyComponent: React.FC<MyComponentProps> = ({
  title,
  variant = 'primary',
  style,
}) => {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={[styles.container, styles[variant], style]}>
      <Text style={styles.text}>{title}</Text>
    </View>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    padding: theme.spacing[4],
    borderRadius: theme.borderRadius.md,
  },
  primary: {
    backgroundColor: theme.colors.primary,
  },
  secondary: {
    backgroundColor: theme.colors.backgroundSecondary,
  },
  text: {
    color: theme.colors.text,
    fontSize: theme.typography.fontSize.base,
  },
});
```

## Required Patterns

### Theming
- ALWAYS use `useAppTheme()` - never hardcode colors
- ALWAYS memoize styles: `useMemo(() => createStyles(theme), [theme])`
- ALWAYS use theme values:
  - Colors: `theme.colors.{primary|text|background|error|...}`
  - Spacing: `theme.spacing[1-8]`
  - Radius: `theme.borderRadius.{sm|md|lg|xl|full}`
  - Font: `theme.typography.fontSize.{xs|sm|base|lg|xl|...}`

### Props
- ALWAYS accept `style?: ViewStyle` for customization
- Extend RN types when wrapping: `interface Props extends Omit<PressableProps, 'style'>`
- Use union types for variants: `variant?: 'primary' | 'secondary'`

### Style Composition
```typescript
style={[styles.base, styles[variant], isDisabled && styles.disabled, style]}
```
Order: base → variant → conditional → user override

### Animations
```typescript
import { Animated } from 'react-native';

const scale = useRef(new Animated.Value(1)).current;

Animated.spring(scale, {
  toValue: 0.97,
  useNativeDriver: true,  // REQUIRED
}).start();
```

## Anti-Patterns

```typescript
// WRONG: Hardcoded values
backgroundColor: '#007AFF'
padding: 16

// CORRECT: Theme values
backgroundColor: theme.colors.primary
padding: theme.spacing[4]

// WRONG: Inline styles object
<View style={{ padding: 16 }}>

// CORRECT: StyleSheet
<View style={styles.container}>

// WRONG: Non-memoized styles
const styles = createStyles(theme);  // Creates every render

// CORRECT: Memoized
const styles = useMemo(() => createStyles(theme), [theme]);
```

## File Naming

- PascalCase: `Button.tsx`, `LoadingSpinner.tsx`
- Feature folders use kebab for folder, PascalCase for files: `auth/LoginForm.tsx`
