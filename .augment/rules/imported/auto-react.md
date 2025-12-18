---
type: "always_apply"
---

# Auto React/React Native Rules

type: auto
description: Apply when working on React, React Native, JSX, TSX, components, or hooks

---

## Component Structure

```typescript
interface ComponentProps {
  // Typed props with JSDoc
  /** Description of prop */
  propName: PropType;
}

export function ComponentName({ prop1, prop2 }: ComponentProps) {
  // Hooks at top
  const [state, setState] = useState<Type>(initial);

  // Effects
  useEffect(() => {
    // Effect logic
    return () => {
      // Cleanup
    };
  }, [dependencies]);

  // Handlers
  const handleAction = useCallback(() => {
    // Handler logic
  }, [dependencies]);

  // Render
  return (
    <View>
      {/* JSX */}
    </View>
  );
}
```

## Performance Optimization

- Use `useMemo` for expensive calculations
- Use `useCallback` for callback props
- Avoid inline object/array creation in JSX
- Use `React.memo` for pure components
- Implement virtualization for long lists

## State Management

- Local state for component-specific data
- Context for shared app state
- Consider Zustand/Jotai for complex state
- Keep state close to where it's used

## React Native Specific

- Use StyleSheet.create() for styles
- Avoid inline styles in render
- Use FlatList for long lists
- Handle keyboard properly
- Test on both iOS and Android

## Accessibility

- All touchables need accessible props
- Images need alt text (accessibilityLabel)
- Proper heading hierarchy
- Color contrast WCAG AA
- Screen reader support
