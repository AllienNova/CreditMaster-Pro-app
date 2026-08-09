# PCTT - Pivot-Constrained Trendline Trading

**TypeScript-based strategy engine** implementing a deterministic, non-repainting trading pipeline derived from the 30 Laws of Trading.

## Architecture

```
implementations/pctt/
├── engine/           TypeScript strategy engine (@strativion/pctt-engine)
│   ├── src/
│   │   ├── types.ts              Enums, interfaces, default configs
│   │   ├── pivot-detection.ts    Fractal pivot detection + ATR calculation
│   │   ├── boundary-estimation.ts Huber/RANSAC boundary fitting + Q-Score
│   │   ├── regime-detection.ts   Efficiency Ratio + Crossing Count classifier
│   │   ├── scoring.ts            4-feature rejection scoring (CLV, wick, direction, position)
│   │   ├── fsm.ts                Finite State Machine (IDLE->WAIT_RETEST->REJECTION/FAIL)
│   │   ├── trailing-stop.ts      5-phase hybrid trailing stop + risk geometry
│   │   └── index.ts              Public API re-exports
│   ├── package.json
│   └── tsconfig.json
├── config/
│   ├── pctt-parameters.yaml      All pipeline thresholds (18 sections)
│   └── pctt-market-adaptations.yaml  Per-market overrides (7 markets)
├── rules/
│   ├── pctt-entry-rules.yaml     8-stage entry pipeline
│   └── pctt-exit-rules.yaml      5-phase trailing + hard stops + invalidation
├── contexts/knowledge/
│   ├── pctt-canonical-specification.md  Complete mathematical specification
│   └── pctt-trading-guide.md     LLM decision guide
├── examples/
│   └── pctt-sample-trades.yaml   12 documented trades with full pipeline data
└── research/                     Original papers, Pine scripts, figures (70+ files)
```

## Pipeline

```
Pivot Detection -> Candidate Lines -> Boundary Estimation (Huber/RANSAC)
-> Q-Score Scoring -> Regime Gate -> Break Detection (FSM)
-> Line Freezing -> Retest/Rejection -> Risk Geometry Filter
-> Entry -> 5-Phase Hybrid Trailing Stop -> Exit
```

## Quick Start

```bash
cd implementations/pctt/engine
npm install
npm run build
```

```typescript
import {
  detectPivots, classifyPivots, calculateATR,
  estimateBoundaries, calculateQScore, gradeSetup,
  detectRegime, isTradeableRegime,
  PCTTStateMachine,
  HybridTrailingStop, riskGeometryFilter, calculatePositionSize
} from '@strativion/pctt-engine'
```

## Relationship to Strativion

PCTT is the **strategy engine**. Strativion is the **orchestration layer**.

| Concern | Platform | Language |
|---------|----------|----------|
| Signal generation pipeline | PCTT | TypeScript |
| Agent orchestration | Strativion | Python |
| Risk formulas (Kelly, ruin) | Strativion | Python |
| 30-Law knowledge base | Strativion | Markdown/YAML |
| Regime classification | Both | TS (PCTT) + PY (Strativion) |

The 6 Strativion agents (Signal, Risk, Execution, Regime, Journal, Meta) all have PCTT integration sections in their context files.
