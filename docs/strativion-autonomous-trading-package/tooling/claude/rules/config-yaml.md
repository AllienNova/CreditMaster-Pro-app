---
paths:
  - "config/**/*.yaml"
  - "rules/**/*.yaml"
  - "reference/market-playbooks/**/*.yaml"
---

# Configuration and YAML Rules (Strativion PCTT Platform)

## SSOT Documentation
- Every config key MUST be documented in a corresponding `SSOT-CFG-XX` section.
- Config changes require updating two places: (1) the relevant `SSOT-CFG` section, (2) the `PROGRESS-TRACKER.md` changelog.
- Include valid range as an inline YAML comment on the same line: `risk_per_trade: 0.02  # valid: 0.001-0.05`
- All numeric values must have units in comments: seconds, percent, dollars, basis_points.

## Formatting
- No tabs anywhere. Use 2-space indentation consistently.
- Use YAML anchors (`&defaults`) and aliases (`*defaults`) for repeated values across config files.
- Keys in snake_case. No camelCase or kebab-case in config keys.
- Strings that could be misinterpreted (e.g., `on`, `off`, `yes`, `no`) must be quoted.

## Trading Rule Files
- All trading rule files in `rules/` MUST have a `law_references:` field linking to Laws 1 through 30.
- Rule files must specify `applicable_regimes:` listing which market regimes activate the rule.
- Regime thresholds: define separate values per regime (trending, mean_reverting, volatile, quiet).
- Every rule file must include `backtest_validation:` with minimum sample size and significance threshold.

## Market Playbook Files
- Playbook files follow strict schema with required top-level keys:
  - `asset_class`: equity, futures, forex, crypto, or options
  - `timeframes`: list of applicable timeframes (1m, 5m, 15m, 1h, 4h, D)
  - `entry_conditions`: list of conditions with operator, threshold, and source indicator
  - `exit_conditions`: stop loss, take profit, and time-based exit rules
  - `risk_params`: position sizing method, max risk per trade, max concurrent positions
- Playbooks must reference the PCTT pipeline stages that generate their signals.

## Risk Limits
- Must define both absolute and percentage-based limits for every risk parameter.
- Example: `max_daily_loss: { absolute: 500, percent: 2.0 }  # dollars and percent of equity`
- Concentration limits must match SSOT-SEC compliance thresholds (25% max single position).
- Drawdown limits: define warning, throttle, and halt thresholds as separate values.

## Validation
- All YAML files must parse without errors. Run `yamllint` before committing.
- Schema validation via JSON Schema definitions in `config/schemas/` directory.
- Environment-specific overrides use the pattern: `config/base.yaml`, `config/dev.yaml`, `config/prod.yaml`.
- Sensitive values (API keys, connection strings) MUST use `${ENV_VAR}` placeholder syntax, never literal values.
