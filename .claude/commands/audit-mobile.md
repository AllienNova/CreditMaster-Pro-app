# Audit Mobile App

Run quality checks on the Fynvita mobile app (Expo/React Native):

```bash
cd mobile-app

# 1. Lint
npm run lint

# 2. Type check
npm run type-check

# 3. Tests + coverage
npm test -- --coverage

# 4. Check coverage thresholds
# Target: 80% global, 90% for stores
```

Report: test count, pass rate, coverage %, any failures. Flag stores below 90% threshold.
