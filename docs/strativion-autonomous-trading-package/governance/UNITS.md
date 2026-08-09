# Units and Conventions

## Purpose

The canonical layer has one unit convention. Consumers that mix conventions produce silent policy drift.

## Canonical Rules

### Percentages

All percentage fields in `canonical/` are **decimal fractions**.

| Correct            | Wrong               |
|--------------------|---------------------|
| `0.01` (= 1%)      | `1.0`, `"1%"`, `1`  |
| `0.005` (= 0.5%)   | `0.5`, `"0.5%"`     |
| `0.06` (= 6%)      | `6.0`, `"6%"`       |

### Monetary values

- Type: decimal (fixed-point), not float.
- Currency is always USD unless explicitly tagged otherwise.

### Time

- Timezone: IANA zone `America/New_York` for all US market times.
- Display strings like `"09:30 ET"` are for human reading; machine parsing uses the IANA zone.
- Date math handles DST through the zone, not through `EST`/`EDT` string switching.

### Durations

- Minutes: integer.
- Seconds: integer unless sub-second precision is explicitly required.

### Prices and Quantities

- Price: decimal, at the venue's tick precision.
- Quantity: integer for shares/contracts, decimal for crypto and fractional equities.

## Reference / Non-Canonical Files

The following files use a **percent-float** convention and are clearly marked `meta.binding: false`:

- `reference/seasonality/seasonality.yaml`
- `reference/playbooks/entry-setups.yaml`
- `reference/playbooks/exit-rules.yaml`
- `reference/guides/*.md`

Consumers MUST NOT merge numbers across conventions. Reference files are not policy.

## Validator

A canonical file fails validation if any of the following is true:

- A percent field is encoded as a float >= 1.0 where the logical value should be a decimal fraction (e.g. `hard_max_pct: 1.0` treated as "100%").
- A time string lacks an IANA zone mapping.
- A monetary field uses a float in a language where Decimal is available.
- A field exists in two canonical files without a CANONICAL-FIELD-INDEX entry resolving the collision.
