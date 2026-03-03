# Autonomous Trading Service — Fly.io Deployment

## Overview

Standalone Node.js service that runs on Fly.io to manage autonomous trading for users in AUTONOMOUS mode. Polls the `trading_accounts` table, creates per-user `AutonomousScheduler` instances, and exposes health/metrics endpoints.

## Architecture

```
Fly.io Machine
├── standalone-server.ts    ← Entry point (HTTP + scheduler manager)
│   ├── Polls trading_accounts every 60s
│   ├── Creates AutonomousScheduler per AUTONOMOUS user
│   └── Exposes /health and /metrics on :8080
└── AutonomousScheduler     ← Per-user instance (from autonomous-scheduler.ts)
    ├── Signal scan cycle (every 5min during market hours)
    ├── Health check (every 15min)
    └── Graduation check (every 1h)
```

## Deploy

```bash
# From the monorepo root:

# 1. Install Fly CLI
curl -L https://fly.io/install.sh | sh

# 2. Login
fly auth login

# 3. Create the app (first time only)
fly apps create fynvita-autonomous-trading

# 4. Set secrets
fly secrets set \
  NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co" \
  SUPABASE_SERVICE_ROLE_KEY="eyJ..." \
  NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..." \
  AIML_API_KEY="..." \
  ALPACA_API_KEY="..." \
  ALPACA_API_SECRET="..." \
  --config src/lib/trading/autonomous/deploy/fly.toml

# 5. Deploy
fly deploy \
  --config src/lib/trading/autonomous/deploy/fly.toml \
  --dockerfile src/lib/trading/autonomous/deploy/Dockerfile

# 6. Check status
fly status --config src/lib/trading/autonomous/deploy/fly.toml
fly logs --config src/lib/trading/autonomous/deploy/fly.toml
```

## Endpoints

| Path | Method | Description |
|------|--------|-------------|
| `/health` | GET | Health check (200 if healthy, 503 if shutting down) |
| `/metrics` | GET | Service metrics (scheduler count, uptime, per-user state) |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | — | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | — | Supabase service role key |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | — | Supabase anonymous key |
| `STANDALONE_MODE` | Yes | `true` | Set by Dockerfile |
| `PORT` | No | `8080` | HTTP server port |
| `POLL_INTERVAL_MS` | No | `60000` | User poll interval (ms) |
| `AIML_API_KEY` | Yes | — | AI model provider key |
| `ALPACA_API_KEY` | Yes | — | Alpaca broker API key |
| `ALPACA_API_SECRET` | Yes | — | Alpaca broker secret |
