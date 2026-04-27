# Check All Quality Gates

Run the full verification pipeline for Fynvita:

```bash
# 1. Lint
npm run lint

# 2. Type check
npm run type-check

# 3. Tests + coverage (web)
npm run test:coverage

# 4. Build
npm run build

# 5. Security audit
npm audit --audit-level=high

# 6. Mobile lint + types + tests
cd mobile-app && npm run lint && npm run type-check && npm test && cd ..
```

Report pass/fail for each gate with coverage percentage.
