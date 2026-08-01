-- Phantom-column batch 2: signal entry tracking and chat message feedback.
--
-- Only the columns with NO existing equivalent are added here. Where the table
-- already had a canonical column the CODE was moved onto it instead — adding a
-- synonym beside a real column is the twin-column defect this wave removes.
--
-- ── trading_signals ───────────────────────────────────────────────────────
-- signal-generator.ts:1340 trackSignalOutcome() updated six columns. Three had
-- canonical equivalents and the code now uses those:
--     exit_price     -> outcome_price
--     closed_at      -> outcome_date
--     actual_return  -> outcome_return_percent
-- One was redundant: `status` was set alongside `outcome` in the same UPDATE,
-- and `outcome` already carries that meaning. The code now clears `is_active`
-- instead, which is the real column expressing "this signal is closed".
-- The two added here have no equivalent — the table recorded how a signal ENDED
-- (outcome, outcome_price, outcome_date) but never how it BEGAN, so realised
-- return could not be recomputed or audited from the row itself:
ALTER TABLE public.trading_signals
  ADD COLUMN IF NOT EXISTS entry_price NUMERIC(18,6);
ALTER TABLE public.trading_signals
  ADD COLUMN IF NOT EXISTS executed_at TIMESTAMPTZ;

-- ── financial_chat_messages ──────────────────────────────────────────────
-- chat-db-service.ts:473 updateMessageFeedback() writes both. Neither exists,
-- so every thumbs-up / thumbs-down a user gave on an AI answer was discarded —
-- and the error branch there only logs, so the UI had no way to know. Feedback
-- on AI output is the primary signal for whether the assistant is any good;
-- silently dropping it is worse than not offering the control.
ALTER TABLE public.financial_chat_messages
  ADD COLUMN IF NOT EXISTS feedback_rating INTEGER
    CHECK (feedback_rating IS NULL OR feedback_rating BETWEEN 1 AND 5);
ALTER TABLE public.financial_chat_messages
  ADD COLUMN IF NOT EXISTS feedback_text TEXT;

COMMENT ON COLUMN public.trading_signals.entry_price IS
  'Price when the signal was acted on. Pairs with outcome_price; without it realised return cannot be recomputed from the row.';
COMMENT ON COLUMN public.trading_signals.executed_at IS
  'When the signal was acted on. Pairs with outcome_date.';
COMMENT ON COLUMN public.financial_chat_messages.feedback_rating IS
  'User rating of an AI response, 1-5. NULL means no feedback given.';
